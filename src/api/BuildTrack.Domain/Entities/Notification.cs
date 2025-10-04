namespace BuildTrack.Domain.Entities;

public class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? Link { get; set; }
    public bool Read { get; set; }
    public DateTime CreatedAt { get; set; }
}

public enum NotificationType
{
    Assignment = 1,
    DocumentUploaded = 2,
    DocumentApproved = 3,
    DocumentRejected = 4,
    DueSoon = 5,
    Overdue = 6,
    MilestoneCompleted = 7,
    Comment = 8
}
