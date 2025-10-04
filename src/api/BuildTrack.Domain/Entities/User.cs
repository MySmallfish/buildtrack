using Microsoft.AspNetCore.Identity;

namespace BuildTrack.Domain.Entities;

public class User : IdentityUser<Guid>
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool Active { get; set; } = true;
    public List<Guid> SkillIds { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    
    // Email verification
    public string? VerificationCode { get; set; }
    public DateTime? VerificationCodeExpiresAt { get; set; }
    public bool IsEmailVerified { get; set; } = false;
}

public enum UserRole
{
    Admin = 1,
    ProjectManager = 2,
    Contributor = 3
}
