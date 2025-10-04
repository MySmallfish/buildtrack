namespace BuildTrack.Domain.Entities;

public class Milestone
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public Guid MilestoneTypeId { get; set; }
    public MilestoneType MilestoneType { get; set; } = null!;
    public DateTime DueDate { get; set; }
    public MilestoneStatus Status { get; set; } = MilestoneStatus.NotStarted;
    public List<Guid> AssignedUserIds { get; set; } = new();
    public bool BlockedFlag { get; set; }
    public bool FailedCheckFlag { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Notes { get; set; }
    public int Order { get; set; }
    public DateTime CreatedAt { get; set; }
    
    public List<DocumentRequirement> DocumentRequirements { get; set; } = new();
    public List<ChecklistItem> ChecklistItems { get; set; } = new();
    
    // Derived property
    public bool IsOverdue => DateTime.UtcNow > DueDate && Status != MilestoneStatus.Completed;
}

public enum MilestoneStatus
{
    NotStarted = 1,
    InProgress = 2,
    PendingReview = 3,
    Completed = 4,
    Blocked = 5
}
