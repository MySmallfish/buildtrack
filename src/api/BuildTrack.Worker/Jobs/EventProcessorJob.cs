using BuildTrack.Worker.Services;
using Quartz;

namespace BuildTrack.Worker.Jobs;

public class EventProcessorJob : IJob
{
    private readonly AutomationService _automationService;
    private readonly ILogger<EventProcessorJob> _logger;

    public EventProcessorJob(AutomationService automationService, ILogger<EventProcessorJob> logger)
    {
        _automationService = automationService;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        _logger.LogInformation("Event processor job started");
        await _automationService.ProcessEventsAsync(context.CancellationToken);
        _logger.LogInformation("Event processor job completed");
    }
}
