namespace BuildTrack.Infrastructure.Data;

public interface IWorkspaceContext
{
    Guid? WorkspaceId { get; }
}

public class WorkspaceContext : IWorkspaceContext
{
    public Guid? WorkspaceId { get; set; }
}
