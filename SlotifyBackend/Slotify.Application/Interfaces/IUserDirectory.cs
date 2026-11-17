namespace Slotify.Application.Interfaces;

public interface IUserDirectory
{
    Task<Dictionary<string, string>> GetDisplayNamesAsync(
        IReadOnlyCollection<string> userIds, CancellationToken ct);
}