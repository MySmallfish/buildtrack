namespace BuildTrack.Domain.Entities;

public class Workspace
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Plan { get; set; } = "Free";
    public string Settings { get; set; } = "{}"; // JSON
    public DateTime CreatedAt { get; set; }
    public bool Active { get; set; } = true;
}
