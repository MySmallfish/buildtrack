using BuildTrack.Domain.Entities;
using BuildTrack.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace BuildTrack.Worker.Services;

public class AutomationService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<AutomationService> _logger;

    public AutomationService(IServiceProvider serviceProvider, ILogger<AutomationService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task ProcessEventsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BuildTrackDbContext>();

        // Get unprocessed events
        var events = await context.IntegrationEvents
            .Where(e => e.ProcessedAt == null && e.Attempts < 5)
            .OrderBy(e => e.CreatedAt)
            .Take(10)
            .ToListAsync(cancellationToken);

        foreach (var evt in events)
        {
            try
            {
                await ProcessEventAsync(evt, context, cancellationToken);
                evt.ProcessedAt = DateTime.UtcNow;
                _logger.LogInformation("Processed event {EventId} of type {EventType}", evt.Id, evt.Type);
            }
            catch (Exception ex)
            {
                evt.Attempts++;
                evt.Error = ex.Message;
                _logger.LogError(ex, "Failed to process event {EventId} (attempt {Attempts})", evt.Id, evt.Attempts);
            }

            await context.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task ProcessEventAsync(IntegrationEvent evt, BuildTrackDbContext context, CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(evt.PayloadJson);
        if (payload == null) return;

        switch (evt.Type)
        {
            case "document_approved":
                await HandleDocumentApprovedAsync(payload, context, cancellationToken);
                break;

            case "document_uploaded":
                _logger.LogInformation("Document uploaded event - no action needed");
                break;

            case "document_rejected":
                _logger.LogInformation("Document rejected event - no action needed");
                break;

            default:
                _logger.LogWarning("Unknown event type: {EventType}", evt.Type);
                break;
        }
    }

    private async Task HandleDocumentApprovedAsync(Dictionary<string, JsonElement> payload, BuildTrackDbContext context, CancellationToken cancellationToken)
    {
        var milestoneId = Guid.Parse(payload["milestoneId"].GetString()!);
        var projectId = Guid.Parse(payload["projectId"].GetString()!);
        var approvedBy = Guid.Parse(payload["approvedBy"].GetString()!);

        // Load milestone with requirements
        var milestone = await context.Milestones
            .Include(m => m.DocumentRequirements)
            .Include(m => m.ChecklistItems)
            .FirstOrDefaultAsync(m => m.Id == milestoneId, cancellationToken);

        if (milestone == null) return;

        // Check if all required documents are approved
        var allRequiredDocsApproved = milestone.DocumentRequirements
            .Where(r => r.Required)
            .All(r => r.State == DocumentRequirementState.Approved);

        // Check if all required checklist items are done
        var allRequiredChecklistDone = milestone.ChecklistItems
            .Where(c => c.Required)
            .All(c => c.Done);

        // Auto-complete milestone if all requirements met
        if (allRequiredDocsApproved && allRequiredChecklistDone && milestone.Status != MilestoneStatus.Completed)
        {
            milestone.Status = MilestoneStatus.Completed;
            milestone.CompletedAt = DateTime.UtcNow;

            // Create timeline event
            var timelineEvent = new TimelineEvent
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                MilestoneId = milestoneId,
                Type = TimelineEventType.MilestoneStatusChanged,
                Message = "Milestone auto-completed: all requirements approved",
                CreatedBy = approvedBy,
                CreatedAt = DateTime.UtcNow
            };
            context.TimelineEvents.Add(timelineEvent);

            // Load project for stakeholder emails
            var project = await context.Projects.FindAsync(new object[] { projectId }, cancellationToken);
            if (project != null && project.StakeholderEmails.Any())
            {
                _logger.LogInformation("Milestone {MilestoneId} completed. Would send emails to: {Emails}", 
                    milestoneId, string.Join(", ", project.StakeholderEmails));
                
                // TODO: Send emails via email service
                // await _emailService.SendMilestoneCompletedAsync(project, milestone, project.StakeholderEmails);
            }

            await context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Auto-completed milestone {MilestoneId}", milestoneId);
        }
    }
}
