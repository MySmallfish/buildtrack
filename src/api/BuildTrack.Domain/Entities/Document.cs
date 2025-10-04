namespace BuildTrack.Domain.Entities;

public class Document
{
    public Guid Id { get; set; }
    public Guid RequirementId { get; set; }
    public DocumentRequirement Requirement { get; set; } = null!;
    public int Version { get; set; }
    public string StorageUrl { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? Checksum { get; set; }
    public Guid UploadedBy { get; set; }
    public User Uploader { get; set; } = null!;
    public DateTime UploadedAt { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Pending;
    public Guid? ReviewerId { get; set; }
    public User? Reviewer { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? RejectionReason { get; set; }
}

public enum DocumentStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3
}
