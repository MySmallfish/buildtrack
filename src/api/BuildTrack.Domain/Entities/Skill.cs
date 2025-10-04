namespace BuildTrack.Domain.Entities;

public class Skill
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Active { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}
