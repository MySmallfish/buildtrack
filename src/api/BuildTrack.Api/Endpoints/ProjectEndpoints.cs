using BuildTrack.Domain.Entities;
using BuildTrack.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BuildTrack.Api.Endpoints;

public static class ProjectEndpoints
{
    public record ProjectDto(
        Guid Id, string Code, string Name, string ProjectType, DateTime StartDate,
        string Owner, List<string> StakeholderEmails, string Status, int CompletedMilestones,
        int TotalMilestones, DateTime? NextDue);

    public record CreateProjectRequest(
        string Name, string? Code, DateTime StartDate, Guid ProjectTypeId,
        Guid OwnerUserId, List<string>? StakeholderEmails, List<string>? Tags, string? Location);

    public record ProjectDetailsDto(
        Guid Id, string Code, string Name, ProjectTypeDto ProjectType, DateTime StartDate,
        UserDto Owner, List<string> StakeholderEmails, List<string> Tags, string? Location,
        string Status, DateTime CreatedAt, List<MilestoneDto> Milestones, List<TimelineEventDto> Timeline);

    public record MilestoneDto(
        Guid Id, string Name, string Type, DateTime DueDate, string Status,
        List<Guid> AssignedUserIds, bool BlockedFlag, bool FailedCheckFlag,
        DateTime? CompletedAt, int RequirementsTotal, int RequirementsCompleted);

    public record TimelineEventDto(
        Guid Id, string Type, string Message, string CreatedBy, DateTime CreatedAt);

    public record UpdateMilestoneRequest(
        DateTime? DueDate, MilestoneStatus? Status, List<Guid>? AssignedUserIds,
        bool? BlockedFlag, bool? FailedCheckFlag, string? Notes);

    public record AddTimelineEventRequest(Guid ProjectId, Guid? MilestoneId, string Message);
    
    public record AddMilestoneUpdateRequest(
        string Comment, 
        MilestoneStatus? NewStatus, 
        Guid? DocumentId);
    
    public record AddCustomMilestoneRequest(
        string Name,
        Guid MilestoneTypeId,
        int DueOffsetDays,
        DateTime? AbsoluteDueDate);

    public record UserDto(Guid Id, string Name, string Email);
    public record ProjectTypeDto(Guid Id, string Name);

    public static void MapProjectEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/projects")
            .WithTags("Projects")
            .RequireAuthorization();

        group.MapGet("", GetProjects).WithName("GetProjects");
        group.MapGet("/{id}", GetProject).WithName("GetProject");
        group.MapPost("", CreateProject).WithName("CreateProject");
        group.MapPatch("/{id}", UpdateProject).WithName("UpdateProject");

        var milestones = app.MapGroup("/api/v1/milestones")
            .WithTags("Milestones")
            .RequireAuthorization();

        milestones.MapPatch("/{id}", UpdateMilestone).WithName("UpdateMilestone");
        milestones.MapPost("/{id}/updates", AddMilestoneUpdate).WithName("AddMilestoneUpdate");
        
        var projectMilestones = app.MapGroup("/api/v1/projects/{projectId}/milestones")
            .WithTags("Milestones")
            .RequireAuthorization();
        
        projectMilestones.MapPost("", AddCustomMilestone).WithName("AddCustomMilestone");

        var timeline = app.MapGroup("/api/v1/timeline")
            .WithTags("Timeline")
            .RequireAuthorization();

        timeline.MapPost("", AddTimelineEvent).WithName("AddTimelineEvent");
    }

    private static async Task<IResult> GetProjects(
        BuildTrackDbContext context,
        [FromQuery] string? status = null,
        [FromQuery] Guid? ownerId = null)
    {
        var query = context.Projects
            .Include(p => p.ProjectType)
            .Include(p => p.Owner)
            .Include(p => p.Milestones)
            .AsQueryable();

        if (status != null && Enum.TryParse<ProjectStatus>(status, out var statusEnum))
        {
            query = query.Where(p => p.Status == statusEnum);
        }

        if (ownerId.HasValue)
        {
            query = query.Where(p => p.OwnerUserId == ownerId.Value);
        }

        var projects = await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ProjectDto(
                p.Id, p.Code, p.Name, p.ProjectType.Name, p.StartDate,
                p.Owner.FullName, p.StakeholderEmails, p.Status.ToString(),
                p.Milestones.Count(m => m.Status == MilestoneStatus.Completed),
                p.Milestones.Count,
                p.Milestones.Where(m => m.Status != MilestoneStatus.Completed)
                    .OrderBy(m => m.DueDate)
                    .Select(m => (DateTime?)m.DueDate)
                    .FirstOrDefault()
            ))
            .ToListAsync();

        return Results.Ok(projects);
    }

    private static async Task<IResult> GetProject(Guid id, BuildTrackDbContext context)
    {
        var project = await context.Projects
            .Include(p => p.ProjectType)
            .Include(p => p.Owner)
            .Include(p => p.Milestones).ThenInclude(m => m.MilestoneType)
            .Include(p => p.Milestones).ThenInclude(m => m.DocumentRequirements)
            .Include(p => p.TimelineEvents).ThenInclude(t => t.Creator)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null) return Results.NotFound();

        var dto = new ProjectDetailsDto(
            project.Id, project.Code, project.Name,
            new ProjectTypeDto(project.ProjectType.Id, project.ProjectType.Name),
            project.StartDate,
            new UserDto(project.Owner.Id, project.Owner.FullName, project.Owner.Email!),
            project.StakeholderEmails, project.Tags, project.Location,
            project.Status.ToString(), project.CreatedAt,
            project.Milestones.OrderBy(m => m.Order).Select(m => new MilestoneDto(
                m.Id, m.Name, m.MilestoneType.Name, m.DueDate, m.Status.ToString(),
                m.AssignedUserIds, m.BlockedFlag, m.FailedCheckFlag, m.CompletedAt,
                m.DocumentRequirements.Count,
                m.DocumentRequirements.Count(r => r.State == DocumentRequirementState.Approved)
            )).ToList(),
            project.TimelineEvents.OrderByDescending(t => t.CreatedAt).Take(20).Select(t => new TimelineEventDto(
                t.Id, t.Type.ToString(), t.Message, t.Creator.FullName, t.CreatedAt
            )).ToList()
        );

        return Results.Ok(dto);
    }

    private static async Task<IResult> CreateProject(
        [FromBody] CreateProjectRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var workspaceId = GetWorkspaceId(httpContext);
        if (workspaceId == null) return Results.Unauthorized();

        var userId = GetUserId(httpContext);
        if (userId == null) return Results.Unauthorized();

        var projectType = await context.ProjectTypes
            .Include(pt => pt.Template)
            .FirstOrDefaultAsync(pt => pt.Id == request.ProjectTypeId);

        if (projectType == null) return Results.BadRequest("Project type not found");

        var code = request.Code ?? $"PRJ-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}";

        // Ensure StartDate is in UTC
        var startDate = request.StartDate.Kind == DateTimeKind.Unspecified 
            ? DateTime.SpecifyKind(request.StartDate, DateTimeKind.Utc)
            : request.StartDate.ToUniversalTime();

        var project = new Project
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId.Value,
            Code = code,
            Name = request.Name,
            ProjectTypeId = request.ProjectTypeId,
            StartDate = startDate,
            OwnerUserId = request.OwnerUserId,
            StakeholderEmails = request.StakeholderEmails ?? new(),
            Tags = request.Tags ?? new(),
            Location = request.Location,
            Status = ProjectStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        context.Projects.Add(project);

        // Create milestones from template
        if (projectType.Template != null)
        {
            var order = 1;
            foreach (var tm in projectType.Template.Milestones.OrderBy(m => m.Order))
            {
                var milestoneType = await context.MilestoneTypes.FindAsync(tm.MilestoneTypeId);
                if (milestoneType == null) continue;

                var milestone = new Milestone
                {
                    Id = Guid.NewGuid(),
                    ProjectId = project.Id,
                    Name = tm.Name,
                    MilestoneTypeId = tm.MilestoneTypeId,
                    DueDate = startDate.AddDays(tm.DueOffsetDays),
                    Status = MilestoneStatus.NotStarted,
                    Order = order++,
                    CreatedAt = DateTime.UtcNow
                };

                context.Milestones.Add(milestone);

                // Create document requirements from milestone type
                foreach (var reqTemplate in milestoneType.DocumentRequirementTemplates)
                {
                    var requirement = new DocumentRequirement
                    {
                        Id = Guid.NewGuid(),
                        MilestoneId = milestone.Id,
                        DocumentTypeId = reqTemplate.DocumentTypeId,
                        Required = reqTemplate.Required,
                        State = DocumentRequirementState.NotProvided,
                        CreatedAt = DateTime.UtcNow
                    };

                    context.DocumentRequirements.Add(requirement);
                }

                // Create checklist items
                foreach (var checklistTemplate in milestoneType.ChecklistTemplates)
                {
                    var checklistItem = new ChecklistItem
                    {
                        Id = Guid.NewGuid(),
                        MilestoneId = milestone.Id,
                        Text = checklistTemplate.Text,
                        Required = checklistTemplate.Required,
                        Done = false,
                        Order = milestoneType.ChecklistTemplates.IndexOf(checklistTemplate) + 1,
                        CreatedAt = DateTime.UtcNow
                    };

                    context.ChecklistItems.Add(checklistItem);
                }
            }
        }

        // Add timeline event
        var timelineEvent = new TimelineEvent
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Type = TimelineEventType.ProjectCreated,
            Message = $"Project created from template {projectType.Name}",
            CreatedBy = userId.Value,
            CreatedAt = DateTime.UtcNow
        };

        context.TimelineEvents.Add(timelineEvent);

        await context.SaveChangesAsync();

        return Results.Created($"/api/v1/projects/{project.Id}", new { id = project.Id, code = project.Code });
    }

    private static async Task<IResult> UpdateProject(
        Guid id,
        [FromBody] object updates,
        BuildTrackDbContext context)
    {
        var project = await context.Projects.FindAsync(id);
        if (project == null) return Results.NotFound();

        // Simple update - in real implementation, parse updates JSON
        await context.SaveChangesAsync();

        return Results.Ok(new { id = project.Id });
    }

    private static async Task<IResult> UpdateMilestone(
        Guid id,
        [FromBody] UpdateMilestoneRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var milestone = await context.Milestones
            .Include(m => m.Project)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (milestone == null) return Results.NotFound();

        var userId = GetUserId(httpContext);
        if (userId == null) return Results.Unauthorized();

        var changed = false;

        if (request.DueDate.HasValue && milestone.DueDate != request.DueDate.Value)
        {
            milestone.DueDate = request.DueDate.Value;
            changed = true;

            var timelineEvent = new TimelineEvent
            {
                Id = Guid.NewGuid(),
                ProjectId = milestone.ProjectId,
                MilestoneId = milestone.Id,
                Type = TimelineEventType.DueDateChanged,
                Message = $"Due date changed to {request.DueDate.Value:yyyy-MM-dd}",
                CreatedBy = userId.Value,
                CreatedAt = DateTime.UtcNow
            };
            context.TimelineEvents.Add(timelineEvent);
        }

        if (request.Status.HasValue && milestone.Status != request.Status.Value)
        {
            var oldStatus = milestone.Status;
            milestone.Status = request.Status.Value;
            
            if (request.Status.Value == MilestoneStatus.Completed)
            {
                milestone.CompletedAt = DateTime.UtcNow;
            }

            changed = true;

            var timelineEvent = new TimelineEvent
            {
                Id = Guid.NewGuid(),
                ProjectId = milestone.ProjectId,
                MilestoneId = milestone.Id,
                Type = TimelineEventType.MilestoneStatusChanged,
                Message = $"Status changed from {oldStatus} to {request.Status.Value}",
                CreatedBy = userId.Value,
                CreatedAt = DateTime.UtcNow
            };
            context.TimelineEvents.Add(timelineEvent);
        }

        if (request.AssignedUserIds != null)
        {
            milestone.AssignedUserIds = request.AssignedUserIds;
            changed = true;
        }

        if (request.BlockedFlag.HasValue)
        {
            milestone.BlockedFlag = request.BlockedFlag.Value;
            changed = true;
        }

        if (request.FailedCheckFlag.HasValue)
        {
            milestone.FailedCheckFlag = request.FailedCheckFlag.Value;
            changed = true;
        }

        if (request.Notes != null)
        {
            milestone.Notes = request.Notes;
            changed = true;
        }

        if (changed)
        {
            await context.SaveChangesAsync();
        }

        return Results.Ok(new { id = milestone.Id });
    }

    private static async Task<IResult> AddTimelineEvent(
        [FromBody] AddTimelineEventRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var userId = GetUserId(httpContext);
        if (userId == null) return Results.Unauthorized();

        var timelineEvent = new TimelineEvent
        {
            Id = Guid.NewGuid(),
            ProjectId = request.ProjectId,
            MilestoneId = request.MilestoneId,
            Type = TimelineEventType.Comment,
            Message = request.Message,
            CreatedBy = userId.Value,
            CreatedAt = DateTime.UtcNow
        };

        context.TimelineEvents.Add(timelineEvent);
        await context.SaveChangesAsync();

        return Results.Created($"/api/v1/timeline/{timelineEvent.Id}", new { id = timelineEvent.Id });
    }

    private static async Task<IResult> AddMilestoneUpdate(
        Guid id,
        [FromBody] AddMilestoneUpdateRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var userId = GetUserId(httpContext);
        if (userId == null) return Results.Unauthorized();

        var milestone = await context.Milestones
            .Include(m => m.Project)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (milestone == null) return Results.NotFound();

        // Add comment as timeline event
        var timelineEvent = new TimelineEvent
        {
            Id = Guid.NewGuid(),
            ProjectId = milestone.ProjectId,
            MilestoneId = milestone.Id,
            Type = TimelineEventType.Comment,
            Message = request.Comment,
            CreatedBy = userId.Value,
            CreatedAt = DateTime.UtcNow
        };
        context.TimelineEvents.Add(timelineEvent);

        // Update status if provided
        if (request.NewStatus.HasValue && milestone.Status != request.NewStatus.Value)
        {
            var oldStatus = milestone.Status;
            milestone.Status = request.NewStatus.Value;

            if (request.NewStatus.Value == MilestoneStatus.Completed)
            {
                milestone.CompletedAt = DateTime.UtcNow;
            }

            var statusEvent = new TimelineEvent
            {
                Id = Guid.NewGuid(),
                ProjectId = milestone.ProjectId,
                MilestoneId = milestone.Id,
                Type = TimelineEventType.MilestoneStatusChanged,
                Message = $"Status changed from {oldStatus} to {request.NewStatus.Value}",
                CreatedBy = userId.Value,
                CreatedAt = DateTime.UtcNow
            };
            context.TimelineEvents.Add(statusEvent);
        }

        // Link document if provided
        if (request.DocumentId.HasValue)
        {
            var document = await context.Documents.FindAsync(request.DocumentId.Value);
            if (document != null)
            {
                var docEvent = new TimelineEvent
                {
                    Id = Guid.NewGuid(),
                    ProjectId = milestone.ProjectId,
                    MilestoneId = milestone.Id,
                    Type = TimelineEventType.DocumentUploaded,
                    Message = $"Document attached: {document.FileName}",
                    CreatedBy = userId.Value,
                    CreatedAt = DateTime.UtcNow
                };
                context.TimelineEvents.Add(docEvent);
            }
        }

        await context.SaveChangesAsync();

        return Results.Ok(new { message = "Update added successfully", milestoneId = milestone.Id });
    }

    private static async Task<IResult> AddCustomMilestone(
        Guid projectId,
        [FromBody] AddCustomMilestoneRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var userId = GetUserId(httpContext);
        if (userId == null) return Results.Unauthorized();

        var project = await context.Projects
            .Include(p => p.Milestones)
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null) return Results.NotFound("Project not found");

        var milestoneType = await context.MilestoneTypes
            .Include(mt => mt.DocumentRequirementTemplates)
            .FirstOrDefaultAsync(mt => mt.Id == request.MilestoneTypeId);

        if (milestoneType == null) return Results.BadRequest("Milestone type not found");

        // Calculate due date
        DateTime dueDate;
        if (request.AbsoluteDueDate.HasValue)
        {
            dueDate = request.AbsoluteDueDate.Value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(request.AbsoluteDueDate.Value, DateTimeKind.Utc)
                : request.AbsoluteDueDate.Value.ToUniversalTime();
        }
        else
        {
            var startDate = project.StartDate.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(project.StartDate, DateTimeKind.Utc)
                : project.StartDate;
            dueDate = startDate.AddDays(request.DueOffsetDays);
        }

        var maxOrder = project.Milestones.Any() ? project.Milestones.Max(m => m.Order) : 0;

        var milestone = new Milestone
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = request.Name,
            MilestoneTypeId = request.MilestoneTypeId,
            DueDate = dueDate,
            Status = MilestoneStatus.NotStarted,
            Order = maxOrder + 1,
            CreatedAt = DateTime.UtcNow
        };

        context.Milestones.Add(milestone);

        // Create document requirements from milestone type
        foreach (var reqTemplate in milestoneType.DocumentRequirementTemplates)
        {
            var requirement = new DocumentRequirement
            {
                Id = Guid.NewGuid(),
                MilestoneId = milestone.Id,
                DocumentTypeId = reqTemplate.DocumentTypeId,
                Required = reqTemplate.Required,
                State = DocumentRequirementState.NotProvided,
                CreatedAt = DateTime.UtcNow
            };
            context.DocumentRequirements.Add(requirement);
        }

        // Add timeline event
        var timelineEvent = new TimelineEvent
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            MilestoneId = milestone.Id,
            Type = TimelineEventType.Comment,
            Message = $"Custom milestone added: {request.Name}",
            CreatedBy = userId.Value,
            CreatedAt = DateTime.UtcNow
        };
        context.TimelineEvents.Add(timelineEvent);

        await context.SaveChangesAsync();

        return Results.Created($"/api/v1/milestones/{milestone.Id}", new { id = milestone.Id });
    }

    private static Guid? GetWorkspaceId(HttpContext context)
    {
        var claim = context.User.FindFirst("workspace_id")?.Value;
        return claim != null && Guid.TryParse(claim, out var id) ? id : null;
    }

    private static Guid? GetUserId(HttpContext context)
    {
        var claim = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return claim != null && Guid.TryParse(claim, out var id) ? id : null;
    }
}
