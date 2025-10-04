namespace BuildTrack.Domain.Entities;

public class Project
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid ProjectTypeId { get; set; }
    public ProjectType ProjectType { get; set; } = null!;
    public DateTime StartDate { get; set; }
    public Guid OwnerUserId { get; set; }
    public User Owner { get; set; } = null!;
    public List<string> StakeholderEmails { get; set; } = new();
    public List<string> Tags { get; set; } = new();
    public string? Location { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Active;
    public DateTime CreatedAt { get; set; }
    public DateTime? ArchivedAt { get; set; }
    
    public List<Milestone> Milestones { get; set; } = new();
    public List<TimelineEvent> TimelineEvents { get; set; } = new();
}

public enum ProjectStatus
{
    Active = 1,
    OnHold = 2,
    Completed = 3,
    Archived = 4
}
