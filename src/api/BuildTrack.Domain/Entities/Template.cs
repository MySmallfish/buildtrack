namespace BuildTrack.Domain.Entities;

public class Template
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Version { get; set; } = 1;
    public List<TemplateMilestone> Milestones { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class TemplateMilestone
{
    public string Name { get; set; } = string.Empty;
    public Guid MilestoneTypeId { get; set; }
    public int DueOffsetDays { get; set; }
    public int Order { get; set; }
}
