using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Slotify.Application.Common;
using Slotify.Application.Staff;
using Slotify.Domain.Constants;
using Slotify.Infrastructure.Data;

namespace Slotify.Infrastructure.Identity;

public class StaffService(UserManager<ApplicationUser> users, AppDbContext db) : IStaffService
{
    public async Task<ServiceResult<List<StaffMemberDto>>> ListAsync(CancellationToken ct)
    {
        var list = await users.GetUsersInRoleAsync(Roles.Staff);
        return ServiceResult<List<StaffMemberDto>>.Ok(
            list.OrderBy(u => u.FullName).Select(ToDto).ToList());
    }

    public async Task<ServiceResult<StaffMemberDto>> AddAsync(AddStaffRequest r, CancellationToken ct)
    {
        var user = await users.FindByEmailAsync(r.Email);
        if (user is null)
            return ServiceResult<StaffMemberDto>.NotFound();

        if (await users.IsInRoleAsync(user, Roles.Owner))
            return ServiceResult<StaffMemberDto>.Invalid("Vlasnik već ima sva prava.");

        if (await users.IsInRoleAsync(user, Roles.Staff))
            return ServiceResult<StaffMemberDto>.Conflict("Korisnik je već u osoblju.");

        var result = await users.AddToRoleAsync(user, Roles.Staff);
        if (!result.Succeeded)
            return ServiceResult<StaffMemberDto>.Invalid(result.Errors.Select(e => e.Description));

        return ServiceResult<StaffMemberDto>.Ok(ToDto(user));
    }

    public async Task<ServiceResult<bool>> RemoveAsync(string userId, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId);
        if (user is null || !await users.IsInRoleAsync(user, Roles.Staff))
            return ServiceResult<bool>.NotFound();

        await users.RemoveFromRoleAsync(user, Roles.Staff);

        // Revoke refresh tokens, so that the old role does not survive the token refresh
        var now = DateTime.UtcNow;
        await db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedUtc, now), ct);

        return ServiceResult<bool>.Ok(true);
    }

    private static StaffMemberDto ToDto(ApplicationUser u) =>
        new(u.Id, u.Email ?? "", u.FullName ?? "");
}