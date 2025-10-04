using BuildTrack.Api.Services;
using BuildTrack.Domain.Entities;
using BuildTrack.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace BuildTrack.Api.Endpoints;

public static class AuthEndpoints
{
    public record LoginRequest(string Email, string Password);
    public record LoginResponse(string AccessToken, string RefreshToken, UserDto User);
    public record RefreshRequest(string RefreshToken);
    public record RegisterRequest(string Email, string Password, string FullName, string WorkspaceName);
    public record RegisterResponse(Guid UserId, string Email, string Message);
    public record VerifyEmailRequest(string Email, string Code);
    public record ResendCodeRequest(string Email);
    public record UserDto(Guid Id, string Email, string FullName, string Role, Guid WorkspaceId);

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth").WithTags("Authentication");

        group.MapPost("/register", Register)
            .WithName("Register")
            .Produces<RegisterResponse>()
            .Produces(400);

        group.MapPost("/verify-email", VerifyEmail)
            .WithName("VerifyEmail")
            .Produces<LoginResponse>()
            .Produces(400);

        group.MapPost("/resend-code", ResendVerificationCode)
            .WithName("ResendVerificationCode")
            .Produces(200)
            .Produces(400);

        group.MapPost("/login", Login)
            .WithName("Login")
            
            .Produces<LoginResponse>()
            .Produces(401);

        group.MapPost("/refresh", Refresh)
            .WithName("RefreshToken")
            
            .Produces<LoginResponse>()
            .Produces(401);

        group.MapPost("/logout", Logout)
            .WithName("Logout")
            
            .RequireAuthorization()
            .Produces(200);

        group.MapGet("/me", GetCurrentUser)
            .WithName("GetCurrentUser")
            
            .RequireAuthorization()
            .Produces<UserDto>();
    }

    private static async Task<IResult> Login(
        [FromBody] LoginRequest request,
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        ITokenService tokenService,
        BuildTrackDbContext context)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null || !user.Active)
        {
            return Results.Unauthorized();
        }

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            return Results.Unauthorized();
        }

        user.LastLoginAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        var accessToken = tokenService.GenerateAccessToken(user);
        var refreshToken = tokenService.GenerateRefreshToken();
        
        if (tokenService is TokenService ts)
        {
            ts.StoreRefreshToken(refreshToken, user.Id, 7);
        }

        var userDto = new UserDto(user.Id, user.Email!, user.FullName, user.Role.ToString(), user.WorkspaceId);
        
        return Results.Ok(new LoginResponse(accessToken, refreshToken, userDto));
    }

    private static async Task<IResult> Refresh(
        [FromBody] RefreshRequest request,
        ITokenService tokenService,
        UserManager<User> userManager)
    {
        var userId = tokenService.ValidateRefreshToken(request.RefreshToken);
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user == null || !user.Active)
        {
            return Results.Unauthorized();
        }

        var accessToken = tokenService.GenerateAccessToken(user);
        var newRefreshToken = tokenService.GenerateRefreshToken();
        
        if (tokenService is TokenService ts)
        {
            ts.RevokeRefreshToken(request.RefreshToken);
            ts.StoreRefreshToken(newRefreshToken, user.Id, 7);
        }

        var userDto = new UserDto(user.Id, user.Email!, user.FullName, user.Role.ToString(), user.WorkspaceId);
        
        return Results.Ok(new LoginResponse(accessToken, newRefreshToken, userDto));
    }

    private static IResult Logout(
        HttpContext context,
        ITokenService tokenService)
    {
        // In a real implementation, you'd extract and revoke the refresh token from a cookie or header
        return Results.Ok(new { message = "Logged out successfully" });
    }

    private static async Task<IResult> GetCurrentUser(
        HttpContext context,
        UserManager<User> userManager)
    {
        var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var user = await userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return Results.Unauthorized();
        }

        var userDto = new UserDto(user.Id, user.Email!, user.FullName, user.Role.ToString(), user.WorkspaceId);
        return Results.Ok(userDto);
    }

    private static async Task<IResult> Register(
        [FromBody] RegisterRequest request,
        UserManager<User> userManager,
        BuildTrackDbContext context,
        IEmailService emailService)
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) || 
            string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.WorkspaceName))
        {
            return Results.BadRequest(new { message = "All fields are required" });
        }

        // Check if user already exists
        var existingUser = await userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            if (existingUser.IsEmailVerified)
            {
                return Results.BadRequest(new { message = "Email already registered" });
            }
            
            // User exists but not verified - resend code
            var newCode = GenerateVerificationCode();
            existingUser.VerificationCode = newCode;
            existingUser.VerificationCodeExpiresAt = DateTime.UtcNow.AddMinutes(15);
            await context.SaveChangesAsync();
            
            await emailService.SendVerificationCodeAsync(existingUser.Email!, newCode, existingUser.FullName);
            
            return Results.Ok(new RegisterResponse(
                existingUser.Id, 
                existingUser.Email!, 
                "Verification code sent to your email"));
        }

        // Create workspace
        var workspace = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = request.WorkspaceName,
            CreatedAt = DateTime.UtcNow
        };
        context.Workspaces.Add(workspace);

        // Create user
        var verificationCode = GenerateVerificationCode();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            UserName = request.Email,
            FullName = request.FullName,
            WorkspaceId = workspace.Id,
            Role = UserRole.Admin, // First user in workspace is admin
            Active = false, // Inactive until email verified
            IsEmailVerified = false,
            VerificationCode = verificationCode,
            VerificationCodeExpiresAt = DateTime.UtcNow.AddMinutes(15),
            CreatedAt = DateTime.UtcNow
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return Results.BadRequest(new { message = string.Join(", ", result.Errors.Select(e => e.Description)) });
        }

        // Send verification email
        await emailService.SendVerificationCodeAsync(user.Email, verificationCode, user.FullName);

        return Results.Ok(new RegisterResponse(user.Id, user.Email, "Verification code sent to your email"));
    }

    private static async Task<IResult> VerifyEmail(
        [FromBody] VerifyEmailRequest request,
        UserManager<User> userManager,
        BuildTrackDbContext context,
        ITokenService tokenService)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return Results.BadRequest(new { message = "Invalid email or verification code" });
        }

        if (user.IsEmailVerified)
        {
            return Results.BadRequest(new { message = "Email already verified" });
        }

        if (user.VerificationCode != request.Code)
        {
            return Results.BadRequest(new { message = "Invalid verification code" });
        }

        if (user.VerificationCodeExpiresAt == null || user.VerificationCodeExpiresAt < DateTime.UtcNow)
        {
            return Results.BadRequest(new { message = "Verification code expired. Please request a new one" });
        }

        // Mark as verified and activate
        user.IsEmailVerified = true;
        user.Active = true;
        user.VerificationCode = null;
        user.VerificationCodeExpiresAt = null;
        user.EmailConfirmed = true; // ASP.NET Identity field
        
        await context.SaveChangesAsync();

        // Generate tokens and log in
        var accessToken = tokenService.GenerateAccessToken(user);
        var refreshToken = tokenService.GenerateRefreshToken();
        
        if (tokenService is TokenService ts)
        {
            ts.StoreRefreshToken(refreshToken, user.Id, 7);
        }

        var userDto = new UserDto(user.Id, user.Email!, user.FullName, user.Role.ToString(), user.WorkspaceId);
        
        return Results.Ok(new LoginResponse(accessToken, refreshToken, userDto));
    }

    private static async Task<IResult> ResendVerificationCode(
        [FromBody] ResendCodeRequest request,
        UserManager<User> userManager,
        BuildTrackDbContext context,
        IEmailService emailService)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return Results.BadRequest(new { message = "Email not found" });
        }

        if (user.IsEmailVerified)
        {
            return Results.BadRequest(new { message = "Email already verified" });
        }

        // Generate new code
        var verificationCode = GenerateVerificationCode();
        user.VerificationCode = verificationCode;
        user.VerificationCodeExpiresAt = DateTime.UtcNow.AddMinutes(15);
        
        await context.SaveChangesAsync();

        // Send email
        await emailService.SendVerificationCodeAsync(user.Email!, verificationCode, user.FullName);

        return Results.Ok(new { message = "Verification code sent to your email" });
    }

    private static string GenerateVerificationCode()
    {
        // Generate a 6-digit code
        return RandomNumberGenerator.GetInt32(100000, 999999).ToString();
    }
}
