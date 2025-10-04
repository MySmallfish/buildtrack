namespace BuildTrack.Domain.Entities;

public class TimelineEvent
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public Guid? MilestoneId { get; set; }
    public Milestone? Milestone { get; set; }
    public TimelineEventType Type { get; set; }
    public string Message { get; set; } = string.Empty;
    public Guid CreatedBy { get; set; }
    public User Creator { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public string? PayloadJson { get; set; }
}

public enum TimelineEventType
{
    ProjectCreated = 1,
    MilestoneCreated = 2,
    MilestoneStatusChanged = 3,
    DocumentUploaded = 4,
    DocumentApproved = 5,
    DocumentRejected = 6,
    Comment = 7,
    AssignmentChanged = 8,
    DueDateChanged = 9
}
