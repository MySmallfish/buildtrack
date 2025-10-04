namespace BuildTrack.Domain.Entities;

public class AutomationRule
{
    public Guid Id { get; set; }
    public Guid WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public AutomationScope Scope { get; set; } = AutomationScope.Global;
    public Guid? ProjectId { get; set; }
    public string Trigger { get; set; } = string.Empty;
    public string ConditionsJson { get; set; } = "{}";
    public string ActionsJson { get; set; } = "[]";
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastRunAt { get; set; }
}

public enum AutomationScope
{
    Global = 1,
    Project = 2
}
