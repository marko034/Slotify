using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Slotify.Application.Auth;
using Slotify.Application.Common;
using Slotify.Application.Email;
using Slotify.Application.Interfaces;
using Slotify.Domain.Constants;
using Slotify.Domain.Enums;
using Slotify.Infrastructure.Data;

namespace Slotify.Infrastructure.Identity;

public class AuthService(
    AppDbContext db,
    UserManager<ApplicationUser> users,
    TokenService tokens,
    IEmailOutbox outbox,
    IClientLinks links) : IAuthService
{
    private const string BadCredentials = "Pogrešan email ili lozinka.";
    private const string InvalidLink = "Link nije ispravan ili je istekao.";

    // ---------- Registracija i potvrda emaila ----------

    public async Task<ServiceResult<bool>> RegisterAsync(RegisterRequest r, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var user = new ApplicationUser { UserName = r.Email, Email = r.Email, FullName = r.FullName.Trim() };
        var created = await users.CreateAsync(user, r.Password);
        if (!created.Succeeded)
            return ServiceResult<bool>.Invalid(created.Errors.Select(e => e.Description));

        var role = await users.AddToRoleAsync(user, Roles.Player);
        if (!role.Succeeded)
            return ServiceResult<bool>.Invalid(role.Errors.Select(e => e.Description));

        await QueueConfirmationEmailAsync(user, ct);
        await tx.CommitAsync(ct);
        return ServiceResult<bool>.Ok(true);
    }

    public async Task<ServiceResult<bool>> ConfirmEmailAsync(ConfirmEmailRequest r, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(r.UserId);
        if (user is null)
            return ServiceResult<bool>.Invalid(InvalidLink);

        if (user.EmailConfirmed)
            return ServiceResult<bool>.Ok(true); // link je već iskorišćen, ponovno otvaranje nije greška

        if (!TryDecode(r.Token, out var token))
            return ServiceResult<bool>.Invalid(InvalidLink);

        var result = await users.ConfirmEmailAsync(user, token);
        return result.Succeeded
            ? ServiceResult<bool>.Ok(true)
            : ServiceResult<bool>.Invalid(InvalidLink);
    }

    public async Task<ServiceResult<bool>> ResendConfirmationAsync(string email, CancellationToken ct)
    {
        var user = await users.FindByEmailAsync(email);
        if (user is not null && !user.EmailConfirmed)
            await QueueConfirmationEmailAsync(user, ct);

        return ServiceResult<bool>.Ok(true); // isti odgovor bez obzira da li nalog postoji
    }

    // ---------- Zaboravljena lozinka ----------

    public async Task<ServiceResult<bool>> ForgotPasswordAsync(string email, CancellationToken ct)
    {
        var user = await users.FindByEmailAsync(email);
        if (user is not null && user.EmailConfirmed)
        {
            var token = await users.GeneratePasswordResetTokenAsync(user);
            outbox.Enqueue(user.Email!,
                AccountEmails.ResetPassword(user.FullName ?? user.Email!, links.ResetPassword(user.Id, token)));
            await db.SaveChangesAsync(ct);
        }

        return ServiceResult<bool>.Ok(true); // ne otkrivamo da li nalog postoji
    }

    public async Task<ServiceResult<bool>> ResetPasswordAsync(ResetPasswordRequest r, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(r.UserId);
        if (user is null || !TryDecode(r.Token, out var token))
            return ServiceResult<bool>.Invalid(InvalidLink);

        var result = await users.ResetPasswordAsync(user, token, r.NewPassword);
        if (!result.Succeeded)
            return ServiceResult<bool>.Invalid(result.Errors.Select(e => e.Description));

        // Link iz mejla dokazuje da korisnik ima pristup adresi
        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            await users.UpdateAsync(user);
        }

        await users.ResetAccessFailedCountAsync(user);
        await users.SetLockoutEndDateAsync(user, null);
        await RevokeAllTokensAsync(user.Id, ct); // sve postojeće sesije se prekidaju

        return ServiceResult<bool>.Ok(true);
    }

    // ---------- Prijava i tokeni ----------

    public async Task<AuthResult> LoginAsync(LoginRequest r, CancellationToken ct)
    {
        var user = await users.FindByEmailAsync(r.Email);
        if (user is null)
            return AuthResult.Unauthorized(BadCredentials);

        if (await users.IsLockedOutAsync(user))
            return AuthResult.Unauthorized("Nalog je privremeno zaključan. Pokušaj ponovo kasnije.");

        if (!await users.CheckPasswordAsync(user, r.Password))
        {
            await users.AccessFailedAsync(user);
            return AuthResult.Unauthorized(BadCredentials);
        }

        await users.ResetAccessFailedCountAsync(user);

        // Stanje naloga otkrivamo tek kad je lozinka tačna
        if (!user.EmailConfirmed)
            return AuthResult.Unauthorized("Potvrdi email adresu pre prijave.", "email_not_confirmed");

        return AuthResult.Ok(await IssueTokensAsync(user, Guid.NewGuid(), ct));
    }

    public async Task<AuthResult> RefreshAsync(string refreshToken, CancellationToken ct)
    {
        var hash = TokenService.Hash(refreshToken);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (stored is null)
            return AuthResult.Unauthorized("Nevažeći token.");

        var now = DateTime.UtcNow;

        // Ponovna upotreba već iskorišćenog tokena: opozovi celu porodicu
        if (stored.RevokedUtc is not null)
        {
            await RevokeFamilyAsync(stored.FamilyId, now, ct);
            return AuthResult.Unauthorized("Nevažeći token.");
        }

        if (stored.ExpiresUtc <= now)
            return AuthResult.Unauthorized("Token je istekao.");

        var user = await users.FindByIdAsync(stored.UserId);
        if (user is null)
            return AuthResult.Unauthorized("Nevažeći token.");

        var roles = await users.GetRolesAsync(user);
        var (access, accessExpires) = tokens.CreateAccessToken(user, roles);
        var (raw, entity) = tokens.CreateRefreshToken(user.Id, stored.FamilyId);

        stored.RevokedUtc = now;
        stored.ReplacedByTokenHash = entity.TokenHash;
        db.RefreshTokens.Add(entity);
        await db.SaveChangesAsync(ct);

        return AuthResult.Ok(new AuthResponse(access, accessExpires, raw, entity.ExpiresUtc));
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken ct)
    {
        var hash = TokenService.Hash(refreshToken);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (stored is null) return;

        await RevokeFamilyAsync(stored.FamilyId, DateTime.UtcNow, ct);
    }

    // ---------- Upravljanje nalogom ----------

    public async Task<AuthResult> ChangePasswordAsync(string userId, ChangePasswordRequest r, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId);
        if (user is null)
            return AuthResult.Unauthorized("Niste prijavljeni.");

        var result = await users.ChangePasswordAsync(user, r.CurrentPassword, r.NewPassword);
        if (!result.Succeeded)
            return AuthResult.Invalid(result.Errors.Select(e => e.Description));

        // Prekini sve ostale sesije, a ovoj dodeli nove tokene
        await RevokeAllTokensAsync(user.Id, ct);
        return AuthResult.Ok(await IssueTokensAsync(user, Guid.NewGuid(), ct));
    }

    public async Task<ServiceResult<bool>> DeleteAccountAsync(string userId, string password, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId);
        if (user is null)
            return ServiceResult<bool>.NotFound();

        if (!await users.CheckPasswordAsync(user, password))
            return ServiceResult<bool>.Invalid("Pogrešna lozinka.");

        if (await users.IsInRoleAsync(user, Roles.Owner))
            return ServiceResult<bool>.Forbidden("Vlasnik ne može da obriše svoj nalog.");

        var email = user.Email;
        var name = user.FullName ?? email ?? "";
        var now = DateTime.UtcNow;

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Predstojeće rezervacije se otkazuju, a istorija ostaje anonimizovana
        await db.Bookings
            .Where(b => b.UserId == userId && b.Status == BookingStatus.Confirmed && b.StartUtc > now)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.Status, BookingStatus.Cancelled), ct);

        await db.Bookings
            .Where(b => b.UserId == userId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(b => b.UserId, (string?)null)
                .SetProperty(b => b.GuestName, "Obrisan korisnik"), ct);

        var deleted = await users.DeleteAsync(user); // refresh tokeni se brišu kaskadno
        if (!deleted.Succeeded)
            return ServiceResult<bool>.Invalid(deleted.Errors.Select(e => e.Description));

        if (email is not null)
        {
            outbox.Enqueue(email, AccountEmails.AccountDeleted(name));
            await db.SaveChangesAsync(ct);
        }

        await tx.CommitAsync(ct);
        return ServiceResult<bool>.Ok(true);
    }

    // ---------- Pomoćne metode ----------

    private async Task QueueConfirmationEmailAsync(ApplicationUser user, CancellationToken ct)
    {
        var token = await users.GenerateEmailConfirmationTokenAsync(user);
        outbox.Enqueue(user.Email!,
            AccountEmails.ConfirmEmail(user.FullName ?? user.Email!, links.ConfirmEmail(user.Id, token)));
        await db.SaveChangesAsync(ct);
    }

    private static bool TryDecode(string encoded, out string token)
    {
        try
        {
            token = Base64UrlEncoder.Decode(encoded);
            return token.Length > 0;
        }
        catch (Exception)
        {
            token = "";
            return false;
        }
    }

    private Task RevokeFamilyAsync(Guid familyId, DateTime now, CancellationToken ct) =>
        db.RefreshTokens
            .Where(t => t.FamilyId == familyId && t.RevokedUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedUtc, now), ct);

    private Task RevokeAllTokensAsync(string userId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        return db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedUtc, now), ct);
    }

    private async Task<AuthResponse> IssueTokensAsync(ApplicationUser user, Guid familyId, CancellationToken ct)
    {
        var roles = await users.GetRolesAsync(user);
        var (access, accessExpires) = tokens.CreateAccessToken(user, roles);
        var (raw, entity) = tokens.CreateRefreshToken(user.Id, familyId);

        db.RefreshTokens.Add(entity);
        await db.SaveChangesAsync(ct);

        return new AuthResponse(access, accessExpires, raw, entity.ExpiresUtc);
    }
}