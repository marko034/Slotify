using Slotify.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Slotify.Application.Auth;
using Slotify.Domain.Constants;

namespace Slotify.Infrastructure.Identity;

public class AuthService : IAuthService
{
    private const string BadCredentials = "Pogrešan email ili lozinka.";

    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;
    private readonly TokenService _tokens;

    public AuthService(AppDbContext db, UserManager<ApplicationUser> users, TokenService tokens)
    {
        _db = db;
        _users = users;
        _tokens = tokens;
    }

    public async Task<AuthResult> RegisterAsync(RegisterRequest r, CancellationToken ct)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var user = new ApplicationUser { UserName = r.Email, Email = r.Email, FullName = r.FullName };
        var created = await _users.CreateAsync(user, r.Password);
        if (!created.Succeeded)
            return AuthResult.Invalid(created.Errors.Select(e => e.Description));

        var roleResult = await _users.AddToRoleAsync(user, Roles.Player);
        if (!roleResult.Succeeded)
            return AuthResult.Invalid(roleResult.Errors.Select(e => e.Description));

        var response = await IssueTokensAsync(user, Guid.NewGuid(), ct);
        await tx.CommitAsync(ct);
        return AuthResult.Ok(response);
    }

    public async Task<AuthResult> LoginAsync(LoginRequest r, CancellationToken ct)
    {
        var user = await _users.FindByEmailAsync(r.Email);
        if (user is null)
            return AuthResult.Unauthorized(BadCredentials);

        if (await _users.IsLockedOutAsync(user))
            return AuthResult.Unauthorized("Nalog je privremeno zaključan. Pokušaj ponovo kasnije.");

        if (!await _users.CheckPasswordAsync(user, r.Password))
        {
            await _users.AccessFailedAsync(user);
            return AuthResult.Unauthorized(BadCredentials);
        }

        await _users.ResetAccessFailedCountAsync(user);

        var response = await IssueTokensAsync(user, Guid.NewGuid(), ct);
        return AuthResult.Ok(response);
    }

    public async Task<AuthResult> RefreshAsync(string refreshToken, CancellationToken ct)
    {
        var hash = TokenService.Hash(refreshToken);
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

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

        var user = await _users.FindByIdAsync(stored.UserId);
        if (user is null)
            return AuthResult.Unauthorized("Nevažeći token.");

        var roles = await _users.GetRolesAsync(user);
        var (access, accessExpires) = _tokens.CreateAccessToken(user, roles);
        var (raw, entity) = _tokens.CreateRefreshToken(user.Id, stored.FamilyId);

        stored.RevokedUtc = now;
        stored.ReplacedByTokenHash = entity.TokenHash;
        _db.RefreshTokens.Add(entity);
        await _db.SaveChangesAsync(ct);

        return AuthResult.Ok(new AuthResponse(access, accessExpires, raw, entity.ExpiresUtc));
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken ct)
    {
        var hash = TokenService.Hash(refreshToken);
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (stored is null) return;

        await RevokeFamilyAsync(stored.FamilyId, DateTime.UtcNow, ct);
    }

    private Task RevokeFamilyAsync(Guid familyId, DateTime now, CancellationToken ct) =>
        _db.RefreshTokens
            .Where(t => t.FamilyId == familyId && t.RevokedUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedUtc, now), ct);

    private async Task<AuthResponse> IssueTokensAsync(ApplicationUser user, Guid familyId, CancellationToken ct)
    {
        var roles = await _users.GetRolesAsync(user);
        var (access, accessExpires) = _tokens.CreateAccessToken(user, roles);
        var (raw, entity) = _tokens.CreateRefreshToken(user.Id, familyId);

        _db.RefreshTokens.Add(entity);
        await _db.SaveChangesAsync(ct);

        return new AuthResponse(access, accessExpires, raw, entity.ExpiresUtc);
    }
}