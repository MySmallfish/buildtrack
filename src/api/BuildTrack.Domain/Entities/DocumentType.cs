namespace BuildTrack.Domain.Entities;

public class DocumentType
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<string> AllowedExtensions { get; set; } = new();
    public int MaxSizeMB { get; set; } = 25;
    public UserRole DefaultApproverRole { get; set; } = UserRole.ProjectManager;
    public DateTime CreatedAt { get; set; }
}
