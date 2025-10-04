using BuildTrack.Domain.Entities;
using BuildTrack.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BuildTrack.Api.Endpoints;

public static class NotificationEndpoints
{
    public record NotificationDto(Guid Id, string Type, string Title, string Body, bool Read, DateTime CreatedAt);

    public static void MapNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/notifications")
            .WithTags("Notifications")
            .RequireAuthorization();

        group.MapGet("", GetNotifications).WithName("GetNotifications");
        group.MapPatch("/{id}/read", MarkAsRead).WithName("MarkNotificationAsRead");
        group.MapPost("/mark-all-read", MarkAllAsRead).WithName("MarkAllNotificationsAsRead");
    }

    private static async Task<IResult> GetNotifications(
        BuildTrackDbContext context,
        HttpContext httpContext,
        [FromQuery] bool? unreadOnly = null)
    {
        var userId = GetUserId(httpContext);
        if (userId == null) return Results.Unauthorized();

        var query = context.Notifications
            .Where(n => n.UserId == userId.Value)
            .AsQueryable();

        if (unreadOnly == true)
        {
            query = query.Where(n => !n.Read);
        }

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .Select(n => new NotificationDto(
                n.Id, n.Type.ToString(), n.Title, n.Body, n.Read, n.CreatedAt
            ))
            .ToListAsync();

        return Results.Ok(notifications);
    }

    private static async Task<IResult> MarkAsRead(
        Guid id,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var userId = GetUserId(httpContext);
        if (userId == null) return Results.Unauthorized();

        var notification = await context.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId.Value);

        if (notification == null) return Results.NotFound();

        notification.Read = true;

        await context.SaveChangesAsync();

        return Results.Ok(new { message = "Notification marked as read" });
    }

    private static async Task<IResult> MarkAllAsRead(
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var userId = GetUserId(httpContext);
        if (userId == null) return Results.Unauthorized();

        var notifications = await context.Notifications
            .Where(n => n.UserId == userId.Value && !n.Read)
            .ToListAsync();

        foreach (var notification in notifications)
        {
            notification.Read = true;
        }

        await context.SaveChangesAsync();

        return Results.Ok(new { message = $"{notifications.Count} notifications marked as read" });
    }

    private static Guid? GetUserId(HttpContext context)
    {
        var claim = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return claim != null && Guid.TryParse(claim, out var id) ? id : null;
    }
}
