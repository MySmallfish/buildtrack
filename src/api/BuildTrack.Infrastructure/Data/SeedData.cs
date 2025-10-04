using BuildTrack.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BuildTrack.Infrastructure.Data;

public static class SeedData
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BuildTrackDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        await context.Database.MigrateAsync();

        // Seed default workspace
        if (!await context.Workspaces.AnyAsync())
        {
            var workspace = new Workspace
            {
                Id = Guid.NewGuid(),
                Name = "Default Workspace",
                Plan = "Free",
                CreatedAt = DateTime.UtcNow,
                Active = true
            };
            context.Workspaces.Add(workspace);
            await context.SaveChangesAsync();

            // Seed Admin user
            var admin = new User
            {
                Id = Guid.NewGuid(),
                WorkspaceId = workspace.Id,
                UserName = "admin@buildtrack.local",
                Email = "admin@buildtrack.local",
                EmailConfirmed = true,
                FullName = "Admin User",
                Role = UserRole.Admin,
                Active = true,
                CreatedAt = DateTime.UtcNow
            };
            await userManager.CreateAsync(admin, "Admin123!");

            // Seed PM user
            var pm = new User
            {
                Id = Guid.NewGuid(),
                WorkspaceId = workspace.Id,
                UserName = "pm@buildtrack.local",
                Email = "pm@buildtrack.local",
                EmailConfirmed = true,
                FullName = "Project Manager",
                Role = UserRole.ProjectManager,
                Active = true,
                CreatedAt = DateTime.UtcNow
            };
            await userManager.CreateAsync(pm, "PM123!");

            // Seed Contributor user
            var contributor = new User
            {
                Id = Guid.NewGuid(),
                WorkspaceId = workspace.Id,
                UserName = "contributor@buildtrack.local",
                Email = "contributor@buildtrack.local",
                EmailConfirmed = true,
                FullName = "Contributor User",
                Role = UserRole.Contributor,
                Active = true,
                CreatedAt = DateTime.UtcNow
            };
            await userManager.CreateAsync(contributor, "Contributor123!");

            // Seed Skills
            var skills = new[]
            {
                new Skill { Id = Guid.NewGuid(), WorkspaceId = workspace.Id, Name = "Engineer", Active = true, CreatedAt = DateTime.UtcNow },
                new Skill { Id = Guid.NewGuid(), WorkspaceId = workspace.Id, Name = "Constructor", Active = true, CreatedAt = DateTime.UtcNow },
                new Skill { Id = Guid.NewGuid(), WorkspaceId = workspace.Id, Name = "Architect", Active = true, CreatedAt = DateTime.UtcNow },
                new Skill { Id = Guid.NewGuid(), WorkspaceId = workspace.Id, Name = "Inspector", Active = true, CreatedAt = DateTime.UtcNow },
                new Skill { Id = Guid.NewGuid(), WorkspaceId = workspace.Id, Name = "Electrician", Active = true, CreatedAt = DateTime.UtcNow },
                new Skill { Id = Guid.NewGuid(), WorkspaceId = workspace.Id, Name = "Plumber", Active = true, CreatedAt = DateTime.UtcNow }
            };
            context.Skills.AddRange(skills);

            // Seed Document Types
            var docTypes = new[]
            {
                new DocumentType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "Permit Application",
                    AllowedExtensions = new List<string> { ".pdf", ".docx" },
                    MaxSizeMB = 25,
                    CreatedAt = DateTime.UtcNow
                },
                new DocumentType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "Environmental Report",
                    AllowedExtensions = new List<string> { ".pdf" },
                    MaxSizeMB = 50,
                    CreatedAt = DateTime.UtcNow
                },
                new DocumentType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "Insurance Certificate",
                    AllowedExtensions = new List<string> { ".pdf", ".jpg", ".png" },
                    MaxSizeMB = 10,
                    CreatedAt = DateTime.UtcNow
                },
                new DocumentType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "Inspector Report",
                    AllowedExtensions = new List<string> { ".pdf", ".docx" },
                    MaxSizeMB = 25,
                    CreatedAt = DateTime.UtcNow
                },
                new DocumentType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "Punch List Resolution",
                    AllowedExtensions = new List<string> { ".pdf", ".xlsx" },
                    MaxSizeMB = 15,
                    CreatedAt = DateTime.UtcNow
                },
                new DocumentType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "Design Plans",
                    AllowedExtensions = new List<string> { ".pdf", ".dwg" },
                    MaxSizeMB = 100,
                    CreatedAt = DateTime.UtcNow
                }
            };
            context.DocumentTypes.AddRange(docTypes);
            await context.SaveChangesAsync();

            // Seed Milestone Types
            var milestoneTypes = new[]
            {
                new MilestoneType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "Design",
                    Description = "Design phase",
                    DocumentRequirementTemplates = new List<DocumentRequirementTemplate>
                    {
                        new DocumentRequirementTemplate { DocumentTypeId = docTypes[5].Id, Required = true }
                    },
                    CreatedAt = DateTime.UtcNow
                },
                new MilestoneType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "Permitting",
                    Description = "Permitting phase",
                    DocumentRequirementTemplates = new List<DocumentRequirementTemplate>
                    {
                        new DocumentRequirementTemplate { DocumentTypeId = docTypes[0].Id, Required = true },
                        new DocumentRequirementTemplate { DocumentTypeId = docTypes[1].Id, Required = true },
                        new DocumentRequirementTemplate { DocumentTypeId = docTypes[2].Id, Required = true }
                    },
                    CreatedAt = DateTime.UtcNow
                },
                new MilestoneType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "Site Preparation",
                    Description = "Site preparation phase",
                    CreatedAt = DateTime.UtcNow
                },
                new MilestoneType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "Foundation",
                    Description = "Foundation phase",
                    CreatedAt = DateTime.UtcNow
                },
                new MilestoneType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "Structure",
                    Description = "Structure phase",
                    CreatedAt = DateTime.UtcNow
                },
                new MilestoneType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "MEP Rough-In",
                    Description = "MEP Rough-In phase",
                    CreatedAt = DateTime.UtcNow
                },
                new MilestoneType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "Finishes",
                    Description = "Finishes phase",
                    CreatedAt = DateTime.UtcNow
                },
                new MilestoneType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "Inspection",
                    Description = "Inspection phase",
                    DocumentRequirementTemplates = new List<DocumentRequirementTemplate>
                    {
                        new DocumentRequirementTemplate { DocumentTypeId = docTypes[3].Id, Required = true },
                        new DocumentRequirementTemplate { DocumentTypeId = docTypes[4].Id, Required = true }
                    },
                    CreatedAt = DateTime.UtcNow
                },
                new MilestoneType
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    Name = "Handover",
                    Description = "Handover phase",
                    CreatedAt = DateTime.UtcNow
                }
            };
            context.MilestoneTypes.AddRange(milestoneTypes);
            await context.SaveChangesAsync();

            // Seed Template for Residential Building
            var template = new Template
            {
                Id = Guid.NewGuid(),
                WorkspaceId = workspace.Id,
                Name = "Residential Building",
                Version = 1,
                Milestones = new List<TemplateMilestone>
                {
                    new TemplateMilestone { Name = "Design", MilestoneTypeId = milestoneTypes[0].Id, DueOffsetDays = 30, Order = 1 },
                    new TemplateMilestone { Name = "Permitting", MilestoneTypeId = milestoneTypes[1].Id, DueOffsetDays = 60, Order = 2 },
                    new TemplateMilestone { Name = "Site Preparation", MilestoneTypeId = milestoneTypes[2].Id, DueOffsetDays = 75, Order = 3 },
                    new TemplateMilestone { Name = "Foundation", MilestoneTypeId = milestoneTypes[3].Id, DueOffsetDays = 105, Order = 4 },
                    new TemplateMilestone { Name = "Structure", MilestoneTypeId = milestoneTypes[4].Id, DueOffsetDays = 150, Order = 5 },
                    new TemplateMilestone { Name = "MEP Rough-In", MilestoneTypeId = milestoneTypes[5].Id, DueOffsetDays = 180, Order = 6 },
                    new TemplateMilestone { Name = "Finishes", MilestoneTypeId = milestoneTypes[6].Id, DueOffsetDays = 210, Order = 7 },
                    new TemplateMilestone { Name = "Inspection", MilestoneTypeId = milestoneTypes[7].Id, DueOffsetDays = 240, Order = 8 },
                    new TemplateMilestone { Name = "Handover", MilestoneTypeId = milestoneTypes[8].Id, DueOffsetDays = 270, Order = 9 }
                },
                CreatedAt = DateTime.UtcNow
            };
            context.Templates.Add(template);
            await context.SaveChangesAsync();

            // Seed Project Type
            var projectType = new ProjectType
            {
                Id = Guid.NewGuid(),
                WorkspaceId = workspace.Id,
                Name = "Residential Building",
                Description = "Standard residential building project",
                TemplateId = template.Id,
                CreatedAt = DateTime.UtcNow
            };
            context.ProjectTypes.Add(projectType);
            await context.SaveChangesAsync();
        }
    }
}
