namespace BuildTrack.Domain.Entities;

/// <summary>
/// Outbox table for reliable event processing
/// </summary>
public class IntegrationEvent
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public int Attempts { get; set; }
    public string? Error { get; set; }
}
