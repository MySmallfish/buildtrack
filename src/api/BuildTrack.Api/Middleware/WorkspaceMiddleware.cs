using BuildTrack.Infrastructure.Data;
using System.Security.Claims;

namespace BuildTrack.Api.Middleware;

public class WorkspaceMiddleware
{
    private readonly RequestDelegate _next;

    public WorkspaceMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IWorkspaceContext workspaceContext)
    {
        var workspaceIdClaim = context.User.FindFirst("workspace_id")?.Value;
        
        if (workspaceIdClaim != null && Guid.TryParse(workspaceIdClaim, out var workspaceId))
        {
            if (workspaceContext is WorkspaceContext wc)
            {
                wc.WorkspaceId = workspaceId;
            }
        }

        await _next(context);
    }
}

public static class WorkspaceMiddlewareExtensions
{
    public static IApplicationBuilder UseWorkspaceContext(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<WorkspaceMiddleware>();
    }
}
