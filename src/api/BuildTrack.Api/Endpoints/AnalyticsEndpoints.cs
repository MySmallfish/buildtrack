using BuildTrack.Domain.Entities;
using BuildTrack.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BuildTrack.Api.Endpoints;

public static class AnalyticsEndpoints
{
    public record AnalyticsSummaryDto(
        ProjectStatsDto Projects,
        MilestoneStatsDto Milestones,
        DocumentStatsDto Documents,
        List<TimeSeriesPointDto> MilestoneCompletionTrend,
        List<OwnerPerformanceDto> TopProjectManagers);

    public record ProjectStatsDto(int Total, int Active, int OnHold, int Archived);
    public record MilestoneStatsDto(int Total, int Completed, int InProgress, int PendingReview, int Blocked, int Overdue);
    public record DocumentStatsDto(int Total, int Pending, int Approved, int Rejected, double AverageApprovalHours);
    public record TimeSeriesPointDto(string Period, int Completed);
    public record OwnerPerformanceDto(Guid OwnerId, string OwnerName, int ActiveProjects, int CompletedMilestones);

    public static void MapAnalyticsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/analytics")
            .WithTags("Analytics")
            .RequireAuthorization();

        group.MapGet("/summary", GetSummary)
            .WithName("GetAnalyticsSummary");
    }

    private static async Task<IResult> GetSummary(
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var workspaceId = GetWorkspaceId(httpContext);
        if (workspaceId == null) return Results.Unauthorized();

        var now = DateTime.UtcNow;

        // Projects
        var projects = await context.Projects
            .Where(p => p.WorkspaceId == workspaceId)
            .Select(p => new { p.Status })
            .ToListAsync();

        var projectStats = new ProjectStatsDto(
            projects.Count,
            projects.Count(p => p.Status == ProjectStatus.Active),
            projects.Count(p => p.Status == ProjectStatus.OnHold),
            projects.Count(p => p.Status == ProjectStatus.Archived));

        // Milestones with project filter
        var milestones = await context.Milestones
            .Where(m => m.Project.WorkspaceId == workspaceId)
            .Select(m => new { m.Status, m.DueDate, m.CompletedAt })
            .ToListAsync();

        var overdueCount = milestones.Count(m => m.Status != MilestoneStatus.Completed && m.DueDate < now);

        var milestoneStats = new MilestoneStatsDto(
            milestones.Count,
            milestones.Count(m => m.Status == MilestoneStatus.Completed),
            milestones.Count(m => m.Status == MilestoneStatus.InProgress),
            milestones.Count(m => m.Status == MilestoneStatus.PendingReview),
            milestones.Count(m => m.Status == MilestoneStatus.Blocked),
            overdueCount);

        // Documents stats and approval time
        var documents = await context.Documents
            .Where(d => d.Requirement.Milestone.Project.WorkspaceId == workspaceId)
            .Select(d => new { d.Status, d.UploadedAt, d.ReviewedAt })
            .ToListAsync();

        var approvedDocs = documents
            .Where(d => d.Status == DocumentStatus.Approved && d.ReviewedAt.HasValue)
            .ToList();

        double avgApprovalHours = approvedDocs.Count == 0
            ? 0
            : approvedDocs.Average(d => (d.ReviewedAt!.Value - d.UploadedAt).TotalHours);

        var documentStats = new DocumentStatsDto(
            documents.Count,
            documents.Count(d => d.Status == DocumentStatus.Pending),
            documents.Count(d => d.Status == DocumentStatus.Approved),
            documents.Count(d => d.Status == DocumentStatus.Rejected),
            Math.Round(avgApprovalHours, 2));

        // Milestone completion trend (last 6 months)
        var sixMonthsAgo = new DateTime(now.Year, now.Month, 1).AddMonths(-5);

        var milestoneTrend = milestones
            .Where(m => m.CompletedAt.HasValue && m.CompletedAt.Value >= sixMonthsAgo)
            .GroupBy(m => new { m.CompletedAt!.Value.Year, m.CompletedAt!.Value.Month })
            .Select(g => new TimeSeriesPointDto(
                new DateTime(g.Key.Year, g.Key.Month, 1).ToString("yyyy-MM"),
                g.Count()))
            .OrderBy(point => point.Period)
            .ToList();

        // Ensure six data points (fill missing months)
        var trendLookup = milestoneTrend.ToDictionary(t => t.Period, t => t.Completed);
        var trendPoints = new List<TimeSeriesPointDto>();
        for (var i = 0; i < 6; i++)
        {
            var month = sixMonthsAgo.AddMonths(i);
            var key = month.ToString("yyyy-MM");
            trendPoints.Add(new TimeSeriesPointDto(key, trendLookup.GetValueOrDefault(key, 0)));
        }

        // Owner performance
        var ownerProjects = await context.Projects
            .Include(p => p.Milestones)
            .Include(p => p.Owner)
            .Where(p => p.WorkspaceId == workspaceId)
            .ToListAsync();

        var ownerPerformance = ownerProjects
            .GroupBy(p => new { p.OwnerUserId, OwnerName = p.Owner.FullName })
            .Select(g => new OwnerPerformanceDto(
                g.Key.OwnerUserId,
                g.Key.OwnerName,
                g.Count(p => p.Status == ProjectStatus.Active),
                g.Sum(p => p.Milestones.Count(m => m.Status == MilestoneStatus.Completed))))
            .OrderByDescending(o => o.CompletedMilestones)
            .ThenByDescending(o => o.ActiveProjects)
            .Take(5)
            .ToList();

        var summary = new AnalyticsSummaryDto(
            projectStats,
            milestoneStats,
            documentStats,
            trendPoints,
            ownerPerformance);

        return Results.Ok(summary);
    }

    private static Guid? GetWorkspaceId(HttpContext context)
    {
        var claim = context.User.FindFirst("workspace_id")?.Value;
        return claim != null && Guid.TryParse(claim, out var id) ? id : null;
    }
}
