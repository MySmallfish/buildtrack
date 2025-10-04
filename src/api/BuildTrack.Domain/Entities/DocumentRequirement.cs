namespace BuildTrack.Domain.Entities;

public class DocumentRequirement
{
    public Guid Id { get; set; }
    public Guid MilestoneId { get; set; }
    public Milestone Milestone { get; set; } = null!;
    public Guid DocumentTypeId { get; set; }
    public DocumentType DocumentType { get; set; } = null!;
    public bool Required { get; set; } = true;
    public DocumentRequirementState State { get; set; } = DocumentRequirementState.NotProvided;
    public Guid? CurrentDocumentId { get; set; }
    public Document? CurrentDocument { get; set; }
    public DateTime CreatedAt { get; set; }
    
    public List<Document> Documents { get; set; } = new();
}

public enum DocumentRequirementState
{
    NotProvided = 1,
    PendingReview = 2,
    Approved = 3,
    Rejected = 4
}
