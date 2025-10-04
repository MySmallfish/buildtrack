using BuildTrack.Domain.Entities;
using BuildTrack.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BuildTrack.Api.Endpoints;

public static class EntityEndpoints
{
    public record SkillDto(Guid Id, string Name, string? Description, bool Active);
    public record CreateSkillRequest(string Name, string? Description);
    public record UpdateSkillRequest(string? Name, string? Description, bool? Active);

    public record DocumentTypeDto(Guid Id, string Name, List<string> AllowedExtensions, int MaxSizeMB, string DefaultApproverRole);
    public record CreateDocumentTypeRequest(string Name, string? Description, List<string>? AllowedExtensions, int? MaxSizeMb);

    public record MilestoneTypeDto(Guid Id, string Name, string? Description);
    public record CreateMilestoneTypeRequest(string Name, string? Description, List<DocumentRequirementTemplate>? DocumentRequirementTemplates);

    public record ProjectTypeDto(Guid Id, string Name, string? Description, Guid? TemplateId);
    public record CreateProjectTypeRequest(string Name, string? Description, Guid? TemplateId);

    public record TemplateDto(Guid Id, string Name, int Version, List<TemplateMilestone> Milestones);
    public record CreateTemplateRequest(string Name, List<TemplateMilestone> Milestones);

    public static void MapEntityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/entities")
            .WithTags("Entities")
            .RequireAuthorization();

        // Skills
        group.MapGet("/skills", GetSkills).WithName("GetSkills");
        group.MapPost("/skills", CreateSkill).WithName("CreateSkill");
        group.MapPatch("/skills/{id}", UpdateSkill).WithName("UpdateSkill");

        // Document Types
        group.MapGet("/document-types", GetDocumentTypes).WithName("GetDocumentTypes");
        group.MapPost("/document-types", CreateDocumentType).WithName("CreateDocumentType");
        group.MapPatch("/document-types/{id}", UpdateDocumentType).WithName("UpdateDocumentType");

        // Milestone Types
        group.MapGet("/milestone-types", GetMilestoneTypes).WithName("GetMilestoneTypes");
        group.MapPost("/milestone-types", CreateMilestoneType).WithName("CreateMilestoneType");
        group.MapPatch("/milestone-types/{id}", UpdateMilestoneType).WithName("UpdateMilestoneType");
        group.MapDelete("/milestone-types/{id}", DeleteMilestoneType).WithName("DeleteMilestoneType");

        // Project Types
        group.MapGet("/project-types", GetProjectTypes).WithName("GetProjectTypes");
        group.MapPost("/project-types", CreateProjectType).WithName("CreateProjectType");
        group.MapPatch("/project-types/{id}", UpdateProjectType).WithName("UpdateProjectType");

        // Templates
        group.MapGet("/templates", GetTemplates).WithName("GetTemplates");
        group.MapGet("/templates/{id}", GetTemplate).WithName("GetTemplate");
        group.MapPost("/templates", CreateTemplate).WithName("CreateTemplate");
    }

    private static async Task<IResult> GetSkills(BuildTrackDbContext context)
    {
        var skills = await context.Skills
            .OrderBy(s => s.Name)
            .Select(s => new SkillDto(s.Id, s.Name, s.Description, s.Active))
            .ToListAsync();

        return Results.Ok(skills);
    }

    private static async Task<IResult> CreateSkill(
        [FromBody] CreateSkillRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var workspaceId = GetWorkspaceId(httpContext);
        if (workspaceId == null) return Results.Unauthorized();

        var skill = new Skill
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId.Value,
            Name = request.Name,
            Description = request.Description,
            Active = true,
            CreatedAt = DateTime.UtcNow
        };

        context.Skills.Add(skill);
        await context.SaveChangesAsync();

        return Results.Created($"/api/v1/entities/skills/{skill.Id}", 
            new SkillDto(skill.Id, skill.Name, skill.Description, skill.Active));
    }

    private static async Task<IResult> UpdateSkill(
        Guid id,
        [FromBody] UpdateSkillRequest request,
        BuildTrackDbContext context)
    {
        var skill = await context.Skills.FindAsync(id);
        if (skill == null) return Results.NotFound();

        if (request.Name != null) skill.Name = request.Name;
        if (request.Description != null) skill.Description = request.Description;
        if (request.Active.HasValue) skill.Active = request.Active.Value;

        await context.SaveChangesAsync();

        return Results.Ok(new SkillDto(skill.Id, skill.Name, skill.Description, skill.Active));
    }

    private static async Task<IResult> GetDocumentTypes(BuildTrackDbContext context)
    {
        var types = await context.DocumentTypes
            .OrderBy(d => d.Name)
            .Select(d => new DocumentTypeDto(d.Id, d.Name, d.AllowedExtensions, d.MaxSizeMB, d.DefaultApproverRole.ToString()))
            .ToListAsync();

        return Results.Ok(types);
    }

    private static async Task<IResult> CreateDocumentType(
        [FromBody] CreateDocumentTypeRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var workspaceId = GetWorkspaceId(httpContext);
        if (workspaceId == null) return Results.Unauthorized();

        var docType = new DocumentType
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId.Value,
            Name = request.Name,
            AllowedExtensions = request.AllowedExtensions ?? new List<string>(),
            MaxSizeMB = request.MaxSizeMb ?? 10,
            CreatedAt = DateTime.UtcNow
        };

        context.DocumentTypes.Add(docType);
        await context.SaveChangesAsync();

        return Results.Created($"/api/v1/entities/document-types/{docType.Id}",
            new DocumentTypeDto(docType.Id, docType.Name, docType.AllowedExtensions, docType.MaxSizeMB, docType.DefaultApproverRole.ToString()));
    }

    private static async Task<IResult> GetMilestoneTypes(BuildTrackDbContext context)
    {
        var types = await context.MilestoneTypes
            .OrderBy(m => m.Name)
            .Select(m => new MilestoneTypeDto(m.Id, m.Name, m.Description))
            .ToListAsync();

        return Results.Ok(types);
    }

    private static async Task<IResult> CreateMilestoneType(
        [FromBody] CreateMilestoneTypeRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var workspaceId = GetWorkspaceId(httpContext);
        if (workspaceId == null) return Results.Unauthorized();

        var milestoneType = new MilestoneType
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId.Value,
            Name = request.Name,
            Description = request.Description,
            DocumentRequirementTemplates = request.DocumentRequirementTemplates ?? new(),
            CreatedAt = DateTime.UtcNow
        };

        context.MilestoneTypes.Add(milestoneType);
        await context.SaveChangesAsync();

        return Results.Created($"/api/v1/entities/milestone-types/{milestoneType.Id}",
            new MilestoneTypeDto(milestoneType.Id, milestoneType.Name, milestoneType.Description));
    }

    private static async Task<IResult> GetProjectTypes(BuildTrackDbContext context)
    {
        var types = await context.ProjectTypes
            .OrderBy(p => p.Name)
            .Select(p => new ProjectTypeDto(p.Id, p.Name, p.Description, p.TemplateId))
            .ToListAsync();

        return Results.Ok(types);
    }

    private static async Task<IResult> CreateProjectType(
        [FromBody] CreateProjectTypeRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var workspaceId = GetWorkspaceId(httpContext);
        if (workspaceId == null) return Results.Unauthorized();

        var projectType = new ProjectType
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId.Value,
            Name = request.Name,
            Description = request.Description,
            TemplateId = request.TemplateId,
            CreatedAt = DateTime.UtcNow
        };

        context.ProjectTypes.Add(projectType);
        await context.SaveChangesAsync();

        return Results.Created($"/api/v1/entities/project-types/{projectType.Id}",
            new ProjectTypeDto(projectType.Id, projectType.Name, projectType.Description, projectType.TemplateId));
    }

    private static async Task<IResult> GetTemplates(BuildTrackDbContext context)
    {
        var templates = await context.Templates
            .OrderBy(t => t.Name)
            .Select(t => new TemplateDto(t.Id, t.Name, t.Version, t.Milestones))
            .ToListAsync();

        return Results.Ok(templates);
    }

    private static async Task<IResult> GetTemplate(Guid id, BuildTrackDbContext context)
    {
        var template = await context.Templates.FindAsync(id);
        if (template == null) return Results.NotFound();

        return Results.Ok(new TemplateDto(template.Id, template.Name, template.Version, template.Milestones));
    }

    private static async Task<IResult> CreateTemplate(
        [FromBody] CreateTemplateRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var workspaceId = GetWorkspaceId(httpContext);
        if (workspaceId == null) return Results.Unauthorized();

        var template = new Template
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId.Value,
            Name = request.Name,
            Version = 1,
            Milestones = request.Milestones,
            CreatedAt = DateTime.UtcNow
        };

        context.Templates.Add(template);
        await context.SaveChangesAsync();

        return Results.Created($"/api/v1/templates/{template.Id}",
            new TemplateDto(template.Id, template.Name, template.Version, template.Milestones));
    }

    private static async Task<IResult> UpdateMilestoneType(
        Guid id,
        [FromBody] CreateMilestoneTypeRequest request,
        BuildTrackDbContext context)
    {
        var milestoneType = await context.MilestoneTypes.FindAsync(id);
            
        if (milestoneType == null) return Results.NotFound();

        milestoneType.Name = request.Name;
        milestoneType.Description = request.Description;
        
        // Replace document requirements (owned entity collection)
        milestoneType.DocumentRequirementTemplates.Clear();
        
        if (request.DocumentRequirementTemplates != null)
        {
            foreach (var reqTemplate in request.DocumentRequirementTemplates)
            {
                milestoneType.DocumentRequirementTemplates.Add(new DocumentRequirementTemplate
                {
                    DocumentTypeId = reqTemplate.DocumentTypeId,
                    Required = reqTemplate.Required
                });
            }
        }

        await context.SaveChangesAsync();

        return Results.Ok(new MilestoneTypeDto(milestoneType.Id, milestoneType.Name, milestoneType.Description));
    }

    private static async Task<IResult> DeleteMilestoneType(
        Guid id,
        BuildTrackDbContext context)
    {
        var milestoneType = await context.MilestoneTypes.FindAsync(id);
        if (milestoneType == null) return Results.NotFound();

        // Check if it's used in any templates
        var isUsed = await context.Templates
            .AnyAsync(t => t.Milestones.Any(m => m.MilestoneTypeId == id));
            
        if (isUsed)
        {
            return Results.BadRequest("Cannot delete milestone type that is used in templates");
        }

        context.MilestoneTypes.Remove(milestoneType);
        await context.SaveChangesAsync();

        return Results.Ok();
    }

    private static async Task<IResult> UpdateProjectType(
        Guid id,
        [FromBody] CreateProjectTypeRequest request,
        BuildTrackDbContext context)
    {
        var projectType = await context.ProjectTypes.FindAsync(id);
        if (projectType == null) return Results.NotFound();

        projectType.Name = request.Name;
        projectType.Description = request.Description;
        projectType.TemplateId = request.TemplateId;

        await context.SaveChangesAsync();

        return Results.Ok(new ProjectTypeDto(projectType.Id, projectType.Name, projectType.Description, projectType.TemplateId));
    }

    private static async Task<IResult> UpdateDocumentType(
        Guid id,
        [FromBody] CreateDocumentTypeRequest request,
        BuildTrackDbContext context)
    {
        var docType = await context.DocumentTypes.FindAsync(id);
        if (docType == null) return Results.NotFound();

        docType.Name = request.Name;
        docType.AllowedExtensions = request.AllowedExtensions ?? new List<string>();
        docType.MaxSizeMB = request.MaxSizeMb ?? 10;

        await context.SaveChangesAsync();

        return Results.Ok(new DocumentTypeDto(docType.Id, docType.Name, docType.AllowedExtensions, docType.MaxSizeMB, docType.DefaultApproverRole.ToString()));
    }

    private static Guid? GetWorkspaceId(HttpContext context)
    {
        var claim = context.User.FindFirst("workspace_id")?.Value;
        return claim != null && Guid.TryParse(claim, out var id) ? id : null;
    }
}
