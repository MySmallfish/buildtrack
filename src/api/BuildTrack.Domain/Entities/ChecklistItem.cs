namespace BuildTrack.Domain.Entities;

public class ChecklistItem
{
    public Guid Id { get; set; }
    public Guid MilestoneId { get; set; }
    public Milestone Milestone { get; set; } = null!;
    public string Text { get; set; } = string.Empty;
    public bool Required { get; set; } = true;
    public bool Done { get; set; }
    public Guid? EvidenceDocumentId { get; set; }
    public int Order { get; set; }
    public DateTime CreatedAt { get; set; }
}
