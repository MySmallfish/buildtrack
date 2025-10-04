using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BuildTrack.Infrastructure.Data;

public class BuildTrackDbContextFactory : IDesignTimeDbContextFactory<BuildTrackDbContext>
{
    public BuildTrackDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<BuildTrackDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=buildtrack;Username=postgres;Password=postgres");

        return new BuildTrackDbContext(optionsBuilder.Options);
    }
}
