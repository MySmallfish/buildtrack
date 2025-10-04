using BuildTrack.Domain.Entities;
using BuildTrack.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BuildTrack.Api.Endpoints;

public static class UserEndpoints
{
    public record UserDto(Guid Id, string Email, string FullName, string Role, List<Guid> SkillIds, bool Active);
    public record CreateUserRequest(string Email, string FullName, string Password, string Role, List<Guid>? SkillIds);
    public record UpdateUserRequest(string? FullName, string? Role, List<Guid>? SkillIds, bool? Active);
    public record AssignmentDto(Guid MilestoneId, string MilestoneName, string ProjectName, string ProjectCode, 
        DateTime DueDate, string Status, List<RequirementDto> Requirements);
    public record RequirementDto(Guid Id, string DocumentType, bool Required, string State);

    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/users")
            .WithTags("Users")
            .RequireAuthorization();

        group.MapGet("", GetUsers).WithName("GetUsers");
        group.MapGet("/{id}", GetUser).WithName("GetUser");
        group.MapPost("", CreateUser).WithName("CreateUser");
        group.MapPatch("/{id}", UpdateUser).WithName("UpdateUser");
        group.MapGet("/me/assignments", GetMyAssignments).WithName("GetMyAssignments");
    }

    private static async Task<IResult> GetUsers(BuildTrackDbContext context)
    {
        var users = await context.Users
            .OrderBy(u => u.FullName)
            .Select(u => new UserDto(u.Id, u.Email!, u.FullName, u.Role.ToString(), u.SkillIds, u.Active))
            .ToListAsync();

        return Results.Ok(users);
    }

    private static async Task<IResult> GetUser(Guid id, BuildTrackDbContext context)
    {
        var user = await context.Users.FindAsync(id);
        if (user == null) return Results.NotFound();

        return Results.Ok(new UserDto(user.Id, user.Email!, user.FullName, user.Role.ToString(), user.SkillIds, user.Active));
    }

    private static async Task<IResult> CreateUser(
        [FromBody] CreateUserRequest request,
        UserManager<User> userManager,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var workspaceId = GetWorkspaceId(httpContext);
        if (workspaceId == null) return Results.Unauthorized();

        var currentUserId = GetUserId(httpContext);
        var currentUser = await context.Users.FindAsync(currentUserId);
        if (currentUser == null || currentUser.Role != UserRole.Admin)
        {
            return Results.Forbid();
        }

        if (!Enum.TryParse<UserRole>(request.Role, out var role))
        {
            return Results.BadRequest("Invalid role");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId.Value,
            Email = request.Email,
            UserName = request.Email,
            FullName = request.FullName,
            Role = role,
            SkillIds = request.SkillIds ?? new(),
            Active = true,
            IsEmailVerified = true,
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return Results.BadRequest(new { errors = result.Errors.Select(e => e.Description) });
        }

        return Results.Created($"/api/v1/users/{user.Id}", 
            new UserDto(user.Id, user.Email!, user.FullName, user.Role.ToString(), user.SkillIds, user.Active));
    }

    private static async Task<IResult> UpdateUser(
        Guid id,
        [FromBody] UpdateUserRequest request,
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var currentUserId = GetUserId(httpContext);
        var currentUser = await context.Users.FindAsync(currentUserId);
        if (currentUser == null || currentUser.Role != UserRole.Admin)
        {
            return Results.Forbid();
        }

        var user = await context.Users.FindAsync(id);
        if (user == null) return Results.NotFound();

        if (request.FullName != null) user.FullName = request.FullName;
        if (request.Role != null && Enum.TryParse<UserRole>(request.Role, out var role))
        {
            user.Role = role;
        }
        if (request.SkillIds != null) user.SkillIds = request.SkillIds;
        if (request.Active.HasValue) user.Active = request.Active.Value;

        await context.SaveChangesAsync();

        return Results.Ok(new UserDto(user.Id, user.Email!, user.FullName, user.Role.ToString(), user.SkillIds, user.Active));
    }

    private static async Task<IResult> GetMyAssignments(
        BuildTrackDbContext context,
        HttpContext httpContext)
    {
        var userId = GetUserId(httpContext);
        if (userId == null) return Results.Unauthorized();

        var milestones = await context.Milestones
            .Include(m => m.Project)
            .Include(m => m.MilestoneType)
            .Include(m => m.DocumentRequirements)
                .ThenInclude(r => r.DocumentType)
            .Where(m => m.AssignedUserIds.Contains(userId.Value))
            .OrderBy(m => m.DueDate)
            .ToListAsync();

        var assignments = milestones.Select(m => new AssignmentDto(
            m.Id, m.Name, m.Project.Name, m.Project.Code, m.DueDate, m.Status.ToString(),
            m.DocumentRequirements.Select(r => new RequirementDto(
                r.Id, r.DocumentType.Name, r.Required, r.State.ToString()
            )).ToList()
        )).ToList();

        return Results.Ok(assignments);
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
