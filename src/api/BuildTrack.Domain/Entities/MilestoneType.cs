namespace BuildTrack.Domain.Entities;

public class MilestoneType
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<DocumentRequirementTemplate> DocumentRequirementTemplates { get; set; } = new();
    public List<ChecklistItemTemplate> ChecklistTemplates { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class DocumentRequirementTemplate
{
    public Guid DocumentTypeId { get; set; }
    public bool Required { get; set; } = true;
}

public class ChecklistItemTemplate
{
    public string Text { get; set; } = string.Empty;
    public bool Required { get; set; } = true;
}
