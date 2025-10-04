namespace BuildTrack.Domain.Entities;

public class ProjectType
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? TemplateId { get; set; }
    public Template? Template { get; set; }
    public DateTime CreatedAt { get; set; }
}
