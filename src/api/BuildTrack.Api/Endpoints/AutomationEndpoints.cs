using BuildTrack.Domain.Entities;
using BuildTrack.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BuildTrack.Api.Endpoints;

public static class AutomationEndpoints
{
    public record AutomationRuleDto(Guid Id, string Name, string Trigger, bool Enabled, DateTime CreatedAt);
    public record CreateAutomationRuleRequest(string Name, string Trigger, string ConditionsJson, string ActionsJson);
    public record UpdateAutomationRuleRequest(string? Name, bool? Enabled);

    public static void MapAutomationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/automations")
            .WithTags("Automations")
            .RequireAuthorization();

        group.MapGet("", GetAutomations).WithName("GetAutomations");
        group.MapGet("/{id}", GetAutomation).WithName("GetAutomation");
        group.MapPost("", CreateAutomation).WithName("CreateAutomation");
        group.MapPatch("/{id}", UpdateAutomation).WithName("UpdateAutomation");
        group.MapDelete("/{id}", DeleteAutomation).WithName("DeleteAutomation");
    }

    private static async Task<IResult> GetAutomations(BuildTrackDbContext context)
    {
        var rules = await context.AutomationRules
            .OrderBy(r => r.Name)
            .Select(r => new AutomationRuleDto(r.Id, r.Name, r.Trigger, r.Enabled, r.CreatedAt))
            .ToListAsync();

        return Results.Ok(rules);
    }

    private static async Task<IResult> GetAutomation(Guid id, BuildTrackDbContext context)
    {
        var rule = await context.AutomationRules.FindAsync(id);
        if (rule == null) return Results.NotFound();

        return Results.Ok(new
        {
            rule.Id,
            rule.Name,
            rule.Trigger,
            rule.ConditionsJson,
            rule.ActionsJson,
            rule.Enabled,
            rule.CreatedAt
        });
    }

    private static async Task<IResult> CreateAutomation(
        [FromBody] CreateAutomationRuleRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var workspaceId = GetWorkspaceId(httpContext);
        if (workspaceId == null) return Results.Unauthorized();

        var userId = GetUserId(httpContext);
        var user = await context.Users.FindAsync(userId);
        if (user == null || (user.Role != UserRole.Admin && user.Role != UserRole.ProjectManager))
        {
            return Results.Forbid();
        }

        var rule = new AutomationRule
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId.Value,
            Name = request.Name,
            Trigger = request.Trigger,
            ConditionsJson = request.ConditionsJson,
            ActionsJson = request.ActionsJson,
            Enabled = true,
            CreatedAt = DateTime.UtcNow
        };

        context.AutomationRules.Add(rule);
        await context.SaveChangesAsync();

        return Results.Created($"/api/v1/automations/{rule.Id}",
            new AutomationRuleDto(rule.Id, rule.Name, rule.Trigger, rule.Enabled, rule.CreatedAt));
    }

    private static async Task<IResult> UpdateAutomation(
        Guid id,
        [FromBody] UpdateAutomationRuleRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var userId = GetUserId(httpContext);
        var user = await context.Users.FindAsync(userId);
        if (user == null || (user.Role != UserRole.Admin && user.Role != UserRole.ProjectManager))
        {
            return Results.Forbid();
        }

        var rule = await context.AutomationRules.FindAsync(id);
        if (rule == null) return Results.NotFound();

        if (request.Name != null) rule.Name = request.Name;
        if (request.Enabled.HasValue) rule.Enabled = request.Enabled.Value;

        await context.SaveChangesAsync();

        return Results.Ok(new AutomationRuleDto(rule.Id, rule.Name, rule.Trigger, rule.Enabled, rule.CreatedAt));
    }

    private static async Task<IResult> DeleteAutomation(
        Guid id,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var userId = GetUserId(httpContext);
        var user = await context.Users.FindAsync(userId);
        if (user == null || user.Role != UserRole.Admin)
        {
            return Results.Forbid();
        }

        var rule = await context.AutomationRules.FindAsync(id);
        if (rule == null) return Results.NotFound();

        context.AutomationRules.Remove(rule);
        await context.SaveChangesAsync();

        return Results.Ok(new { message = "Automation rule deleted" });
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
