using BuildTrack.Infrastructure.Data;
using BuildTrack.Worker.Jobs;
using BuildTrack.Worker.Services;
using Microsoft.EntityFrameworkCore;
using Quartz;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

var builder = Host.CreateApplicationBuilder(args);

// Serilog
builder.Services.AddSerilog();

// Database
builder.Services.AddDbContext<BuildTrackDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Services
builder.Services.AddScoped<AutomationService>();

// Quartz
builder.Services.AddQuartz(q =>
{
    q.UseMicrosoftDependencyInjectionJobFactory();

    // Event processor job - runs every 30 seconds
    var eventJobKey = new JobKey("EventProcessorJob");
    q.AddJob<EventProcessorJob>(opts => opts.WithIdentity(eventJobKey));
    q.AddTrigger(opts => opts
        .ForJob(eventJobKey)
        .WithIdentity("EventProcessorJob-trigger")
        .WithSimpleSchedule(x => x
            .WithIntervalInSeconds(30)
            .RepeatForever()));
});

builder.Services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);

var host = builder.Build();

Log.Information("BuildTrack Worker starting...");
host.Run();
