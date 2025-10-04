namespace BuildTrack.Domain.Entities;

public class AuditLog
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public Guid ActorId { get; set; }
    public User Actor { get; set; } = null!;
    public string Action { get; set; } = string.Empty;
    public string ObjectType { get; set; } = string.Empty;
    public Guid? ObjectId { get; set; }
    public DateTime Timestamp { get; set; }
    public string? DiffJson { get; set; }
    public string? IpAddress { get; set; }
}
