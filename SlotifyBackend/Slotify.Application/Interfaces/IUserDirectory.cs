namespace Slotify.Application.Interfaces;

public record UserContact(string Email, string FullName);

public interface IUserDirectory
{
    Task<Dictionary<string, string>> GetDisplayNamesAsync(
        IReadOnlyCollection<string> userIds, CancellationToken ct);

    Task<Dictionary<string, UserContact>> GetContactsAsync(
        IReadOnlyCollection<string> userIds, CancellationToken ct);
}