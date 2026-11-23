using Microsoft.EntityFrameworkCore;
using Slotify.Application.Interfaces;
using Slotify.Infrastructure.Data;

namespace Slotify.Infrastructure.Identity;

public class UserDirectory(AppDbContext db) : IUserDirectory
{
    public async Task<Dictionary<string, string>> GetDisplayNamesAsync(
        IReadOnlyCollection<string> userIds, CancellationToken ct) =>
        await db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName ?? u.Email ?? "", ct);

    public async Task<Dictionary<string, UserContact>> GetContactsAsync(
        IReadOnlyCollection<string> userIds, CancellationToken ct) =>
        await db.Users
            .Where(u => userIds.Contains(u.Id) && u.Email != null)
            .ToDictionaryAsync(u => u.Id, u => new UserContact(u.Email!, u.FullName ?? u.Email!), ct);
}