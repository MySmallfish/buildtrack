using BuildTrack.Domain.Entities;
using BuildTrack.Infrastructure.Data;
using BuildTrack.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BuildTrack.Api.Endpoints;

public static class DocumentEndpoints
{
    public record GetUploadUrlRequest(string FileName, string ContentType, long Size, string? Md5);
    public record UploadUrlResponse(string Url, Dictionary<string, string> Headers, string Key, DateTime ExpiresAt);
    
    public record ConfirmUploadRequest(Guid RequirementId, string Key, string FileName, long Size, string? Checksum);
    public record DocumentDto(Guid Id, int Version, string FileName, long FileSizeBytes, string Status, 
        DateTime UploadedAt, string UploadedBy, DateTime? ReviewedAt, string? ReviewedBy, string? RejectionReason);

    public record ApproveDocumentRequest(string? Comment);
    public record RejectDocumentRequest(string Reason);

    public static void MapDocumentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1")
            .WithTags("Documents")
            .RequireAuthorization();

        group.MapPost("/requirements/{reqId}/upload-url", GetUploadUrl)
            .WithName("GetUploadUrl");

        group.MapPost("/documents/confirm", ConfirmUpload)
            .WithName("ConfirmUpload");

        group.MapGet("/documents", GetDocuments)
            .WithName("GetDocuments");

        group.MapPost("/documents/{id}/approve", ApproveDocument)
            .WithName("ApproveDocument");

        group.MapPost("/documents/{id}/reject", RejectDocument)
            .WithName("RejectDocument");

        group.MapGet("/documents/{id}/download-url", GetDownloadUrl)
            .WithName("GetDownloadUrl");
    }

    private static async Task<IResult> GetUploadUrl(
        Guid reqId,
        [FromBody] GetUploadUrlRequest request,
        BuildTrackDbContext context,
        IS3Service s3Service,
        HttpContext httpContext)
    {
        var requirement = await context.DocumentRequirements
            .Include(r => r.DocumentType)
            .Include(r => r.Milestone)
            .FirstOrDefaultAsync(r => r.Id == reqId);

        if (requirement == null) return Results.NotFound();

        var userId = GetUserId(httpContext);
        if (userId == null) return Results.Unauthorized();

        // Check if user is assigned to milestone or is PM/Admin
        var user = await context.Users.FindAsync(userId.Value);
        if (user == null) return Results.Unauthorized();

        if (user.Role == UserRole.Contributor && 
            !requirement.Milestone.AssignedUserIds.Contains(userId.Value))
        {
            return Results.Forbid();
        }

        // Validate file extension
        var extension = Path.GetExtension(request.FileName).ToLowerInvariant();
        if (!requirement.DocumentType.AllowedExtensions.Contains(extension))
        {
            return Results.BadRequest($"File type {extension} not allowed. Allowed types: {string.Join(", ", requirement.DocumentType.AllowedExtensions)}");
        }

        // Validate file size
        var maxSizeBytes = requirement.DocumentType.MaxSizeMB * 1024 * 1024;
        if (request.Size > maxSizeBytes)
        {
            return Results.BadRequest($"File size exceeds maximum of {requirement.DocumentType.MaxSizeMB} MB");
        }

        var (url, headers, key) = await s3Service.GeneratePresignedUploadUrlAsync(
            request.FileName, request.ContentType, request.Size);

        return Results.Ok(new UploadUrlResponse(url, headers, key, DateTime.UtcNow.AddMinutes(5)));
    }

    private static async Task<IResult> ConfirmUpload(
        [FromBody] ConfirmUploadRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var requirement = await context.DocumentRequirements
            .Include(r => r.Documents)
            .Include(r => r.Milestone)
            .FirstOrDefaultAsync(r => r.Id == request.RequirementId);

        if (requirement == null) return Results.NotFound();

        var userId = GetUserId(httpContext);
        if (userId == null) return Results.Unauthorized();

        var version = requirement.Documents.Count + 1;

        var document = new Document
        {
            Id = Guid.NewGuid(),
            RequirementId = request.RequirementId,
            Version = version,
            StorageUrl = request.Key,
            FileName = request.FileName,
            FileSizeBytes = request.Size,
            Checksum = request.Checksum,
            UploadedBy = userId.Value,
            UploadedAt = DateTime.UtcNow,
            Status = DocumentStatus.Pending
        };

        context.Documents.Add(document);

        requirement.State = DocumentRequirementState.PendingReview;
        requirement.CurrentDocumentId = document.Id;

        // Add timeline event
        var timelineEvent = new TimelineEvent
        {
            Id = Guid.NewGuid(),
            ProjectId = requirement.Milestone.ProjectId,
            MilestoneId = requirement.MilestoneId,
            Type = TimelineEventType.DocumentUploaded,
            Message = $"Document uploaded: {request.FileName}",
            CreatedBy = userId.Value,
            CreatedAt = DateTime.UtcNow
        };
        context.TimelineEvents.Add(timelineEvent);

        // Create integration event for automation
        var integrationEvent = new IntegrationEvent
        {
            Id = Guid.NewGuid(),
            Type = "document_uploaded",
            PayloadJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                documentId = document.Id,
                requirementId = requirement.Id,
                milestoneId = requirement.MilestoneId,
                projectId = requirement.Milestone.ProjectId,
                uploadedBy = userId.Value
            }),
            CreatedAt = DateTime.UtcNow
        };
        context.IntegrationEvents.Add(integrationEvent);

        await context.SaveChangesAsync();

        return Results.Ok(new { documentId = document.Id, status = "Pending" });
    }

    private static async Task<IResult> GetDocuments(
        BuildTrackDbContext context,
        [FromQuery] string? status = null,
        [FromQuery] Guid? projectId = null)
    {
        var query = context.Documents
            .Include(d => d.Uploader)
            .Include(d => d.Reviewer)
            .Include(d => d.Requirement)
                .ThenInclude(r => r.Milestone)
                .ThenInclude(m => m.Project)
            .AsQueryable();

        if (status != null && Enum.TryParse<DocumentStatus>(status, out var statusEnum))
        {
            query = query.Where(d => d.Status == statusEnum);
        }

        if (projectId.HasValue)
        {
            query = query.Where(d => d.Requirement.Milestone.ProjectId == projectId.Value);
        }

        var documents = await query
            .OrderByDescending(d => d.UploadedAt)
            .Take(100)
            .Select(d => new DocumentDto(
                d.Id, d.Version, d.FileName, d.FileSizeBytes, d.Status.ToString(),
                d.UploadedAt, d.Uploader.FullName, d.ReviewedAt,
                d.Reviewer != null ? d.Reviewer.FullName : null, d.RejectionReason
            ))
            .ToListAsync();

        return Results.Ok(documents);
    }

    private static async Task<IResult> ApproveDocument(
        Guid id,
        [FromBody] ApproveDocumentRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var document = await context.Documents
            .Include(d => d.Requirement)
                .ThenInclude(r => r.Milestone)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (document == null) return Results.NotFound();

        var userId = GetUserId(httpContext);
        if (userId == null) return Results.Unauthorized();

        var user = await context.Users.FindAsync(userId.Value);
        if (user == null || user.Role == UserRole.Contributor)
        {
            return Results.Forbid();
        }

        document.Status = DocumentStatus.Approved;
        document.ReviewerId = userId.Value;
        document.ReviewedAt = DateTime.UtcNow;

        document.Requirement.State = DocumentRequirementState.Approved;

        // Add timeline event
        var timelineEvent = new TimelineEvent
        {
            Id = Guid.NewGuid(),
            ProjectId = document.Requirement.Milestone.ProjectId,
            MilestoneId = document.Requirement.MilestoneId,
            Type = TimelineEventType.DocumentApproved,
            Message = $"Document approved: {document.FileName}",
            CreatedBy = userId.Value,
            CreatedAt = DateTime.UtcNow
        };
        context.TimelineEvents.Add(timelineEvent);

        // Create integration event for automation
        var integrationEvent = new IntegrationEvent
        {
            Id = Guid.NewGuid(),
            Type = "document_approved",
            PayloadJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                documentId = document.Id,
                requirementId = document.RequirementId,
                milestoneId = document.Requirement.MilestoneId,
                projectId = document.Requirement.Milestone.ProjectId,
                approvedBy = userId.Value
            }),
            CreatedAt = DateTime.UtcNow
        };
        context.IntegrationEvents.Add(integrationEvent);

        await context.SaveChangesAsync();

        return Results.Ok(new { message = "Document approved" });
    }

    private static async Task<IResult> RejectDocument(
        Guid id,
        [FromBody] RejectDocumentRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var document = await context.Documents
            .Include(d => d.Requirement)
                .ThenInclude(r => r.Milestone)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (document == null) return Results.NotFound();

        var userId = GetUserId(httpContext);
        if (userId == null) return Results.Unauthorized();

        var user = await context.Users.FindAsync(userId.Value);
        if (user == null || user.Role == UserRole.Contributor)
        {
            return Results.Forbid();
        }

        document.Status = DocumentStatus.Rejected;
        document.ReviewerId = userId.Value;
        document.ReviewedAt = DateTime.UtcNow;
        document.RejectionReason = request.Reason;

        document.Requirement.State = DocumentRequirementState.Rejected;

        // Add timeline event
        var timelineEvent = new TimelineEvent
        {
            Id = Guid.NewGuid(),
            ProjectId = document.Requirement.Milestone.ProjectId,
            MilestoneId = document.Requirement.MilestoneId,
            Type = TimelineEventType.DocumentRejected,
            Message = $"Document rejected: {document.FileName} - {request.Reason}",
            CreatedBy = userId.Value,
            CreatedAt = DateTime.UtcNow
        };
        context.TimelineEvents.Add(timelineEvent);

        // Create integration event
        var integrationEvent = new IntegrationEvent
        {
            Id = Guid.NewGuid(),
            Type = "document_rejected",
            PayloadJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                documentId = document.Id,
                requirementId = document.RequirementId,
                milestoneId = document.Requirement.MilestoneId,
                projectId = document.Requirement.Milestone.ProjectId,
                rejectedBy = userId.Value,
                reason = request.Reason
            }),
            CreatedAt = DateTime.UtcNow
        };
        context.IntegrationEvents.Add(integrationEvent);

        await context.SaveChangesAsync();

        return Results.Ok(new { message = "Document rejected" });
    }

    private static async Task<IResult> GetDownloadUrl(
        Guid id,
        BuildTrackDbContext context,
        IS3Service s3Service)
    {
        var document = await context.Documents.FindAsync(id);
        if (document == null) return Results.NotFound();

        var url = await s3Service.GeneratePresignedDownloadUrlAsync(document.StorageUrl);

        return Results.Ok(new { url, expiresAt = DateTime.UtcNow.AddMinutes(5) });
    }

    private static Guid? GetUserId(HttpContext context)
    {
        var claim = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return claim != null && Guid.TryParse(claim, out var id) ? id : null;
    }
}
