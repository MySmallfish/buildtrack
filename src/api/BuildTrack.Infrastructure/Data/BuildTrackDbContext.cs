using BuildTrack.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BuildTrack.Infrastructure.Data;

public class BuildTrackDbContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
{
    private readonly Guid? _workspaceId;

    public BuildTrackDbContext(DbContextOptions<BuildTrackDbContext> options) : base(options)
    {
    }

    public BuildTrackDbContext(DbContextOptions<BuildTrackDbContext> options, IWorkspaceContext workspaceContext) 
        : base(options)
    {
        _workspaceId = workspaceContext.WorkspaceId;
    }

    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<DocumentType> DocumentTypes => Set<DocumentType>();
    public DbSet<MilestoneType> MilestoneTypes => Set<MilestoneType>();
    public DbSet<ProjectType> ProjectTypes => Set<ProjectType>();
    public DbSet<Template> Templates => Set<Template>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Milestone> Milestones => Set<Milestone>();
    public DbSet<DocumentRequirement> DocumentRequirements => Set<DocumentRequirement>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<ChecklistItem> ChecklistItems => Set<ChecklistItem>();
    public DbSet<TimelineEvent> TimelineEvents => Set<TimelineEvent>();
    public DbSet<AutomationRule> AutomationRules => Set<AutomationRule>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<IntegrationEvent> IntegrationEvents => Set<IntegrationEvent>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Global workspace query filter
        builder.Entity<User>().HasQueryFilter(e => _workspaceId == null || e.WorkspaceId == _workspaceId);
        builder.Entity<Skill>().HasQueryFilter(e => _workspaceId == null || e.WorkspaceId == _workspaceId);
        builder.Entity<DocumentType>().HasQueryFilter(e => _workspaceId == null || e.WorkspaceId == _workspaceId);
        builder.Entity<MilestoneType>().HasQueryFilter(e => _workspaceId == null || e.WorkspaceId == _workspaceId);
        builder.Entity<ProjectType>().HasQueryFilter(e => _workspaceId == null || e.WorkspaceId == _workspaceId);
        builder.Entity<Template>().HasQueryFilter(e => _workspaceId == null || e.WorkspaceId == _workspaceId);
        builder.Entity<Project>().HasQueryFilter(e => _workspaceId == null || e.WorkspaceId == _workspaceId);
        builder.Entity<AutomationRule>().HasQueryFilter(e => _workspaceId == null || e.WorkspaceId == _workspaceId);
        builder.Entity<AuditLog>().HasQueryFilter(e => _workspaceId == null || e.WorkspaceId == _workspaceId);

        // Workspace
        builder.Entity<Workspace>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
        });

        // User
        builder.Entity<User>(entity =>
        {
            entity.HasOne(e => e.Workspace).WithMany().HasForeignKey(e => e.WorkspaceId);
            entity.Property(e => e.FullName).HasMaxLength(200);
            entity.Property(e => e.SkillIds).HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<Guid>>(v, (JsonSerializerOptions?)null) ?? new List<Guid>());
            entity.HasIndex(e => e.WorkspaceId);
        });

        // Skill
        builder.Entity<Skill>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => new { e.WorkspaceId, e.Name }).IsUnique();
        });

        // DocumentType
        builder.Entity<DocumentType>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.AllowedExtensions).HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());
            entity.HasIndex(e => new { e.WorkspaceId, e.Name });
        });

        // MilestoneType
        builder.Entity<MilestoneType>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.DocumentRequirementTemplates).HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<DocumentRequirementTemplate>>(v, (JsonSerializerOptions?)null) ?? new List<DocumentRequirementTemplate>());
            entity.Property(e => e.ChecklistTemplates).HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<ChecklistItemTemplate>>(v, (JsonSerializerOptions?)null) ?? new List<ChecklistItemTemplate>());
            entity.HasIndex(e => new { e.WorkspaceId, e.Name });
        });

        // ProjectType
        builder.Entity<ProjectType>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.HasOne(e => e.Template).WithMany().HasForeignKey(e => e.TemplateId);
            entity.HasIndex(e => new { e.WorkspaceId, e.Name });
        });

        // Template
        builder.Entity<Template>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Milestones).HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<TemplateMilestone>>(v, (JsonSerializerOptions?)null) ?? new List<TemplateMilestone>());
            entity.HasIndex(e => e.WorkspaceId);
        });

        // Project
        builder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.HasOne(e => e.ProjectType).WithMany().HasForeignKey(e => e.ProjectTypeId);
            entity.HasOne(e => e.Owner).WithMany().HasForeignKey(e => e.OwnerUserId);
            entity.Property(e => e.StakeholderEmails).HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());
            entity.Property(e => e.Tags).HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());
            entity.HasIndex(e => new { e.WorkspaceId, e.Code }).IsUnique();
            entity.HasIndex(e => e.WorkspaceId);
        });

        // Milestone
        builder.Entity<Milestone>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.HasOne(e => e.Project).WithMany(p => p.Milestones).HasForeignKey(e => e.ProjectId);
            entity.HasOne(e => e.MilestoneType).WithMany().HasForeignKey(e => e.MilestoneTypeId);
            entity.Property(e => e.AssignedUserIds).HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<Guid>>(v, (JsonSerializerOptions?)null) ?? new List<Guid>());
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.DueDate);
            entity.Ignore(e => e.IsOverdue);
        });

        // DocumentRequirement
        builder.Entity<DocumentRequirement>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Milestone).WithMany(m => m.DocumentRequirements).HasForeignKey(e => e.MilestoneId);
            entity.HasOne(e => e.DocumentType).WithMany().HasForeignKey(e => e.DocumentTypeId);
            entity.HasOne(e => e.CurrentDocument).WithMany().HasForeignKey(e => e.CurrentDocumentId).OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => e.MilestoneId);
        });

        // Document
        builder.Entity<Document>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(500);
            entity.HasOne(e => e.Requirement).WithMany(r => r.Documents).HasForeignKey(e => e.RequirementId);
            entity.HasOne(e => e.Uploader).WithMany().HasForeignKey(e => e.UploadedBy);
            entity.HasOne(e => e.Reviewer).WithMany().HasForeignKey(e => e.ReviewerId).OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => new { e.RequirementId, e.UploadedAt });
        });

        // ChecklistItem
        builder.Entity<ChecklistItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Text).IsRequired().HasMaxLength(500);
            entity.HasOne(e => e.Milestone).WithMany(m => m.ChecklistItems).HasForeignKey(e => e.MilestoneId);
            entity.HasIndex(e => e.MilestoneId);
        });

        // TimelineEvent
        builder.Entity<TimelineEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project).WithMany(p => p.TimelineEvents).HasForeignKey(e => e.ProjectId);
            entity.HasOne(e => e.Milestone).WithMany().HasForeignKey(e => e.MilestoneId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Creator).WithMany().HasForeignKey(e => e.CreatedBy);
            entity.HasIndex(e => new { e.ProjectId, e.CreatedAt });
        });

        // AutomationRule
        builder.Entity<AutomationRule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.WorkspaceId);
        });

        // Notification
        builder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.Read, e.CreatedAt });
        });

        // AuditLog
        builder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Actor).WithMany().HasForeignKey(e => e.ActorId);
            entity.HasIndex(e => new { e.WorkspaceId, e.Timestamp });
            entity.HasIndex(e => new { e.ObjectType, e.ObjectId });
        });

        // IntegrationEvent
        builder.Entity<IntegrationEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ProcessedAt, e.CreatedAt });
        });
    }
}
