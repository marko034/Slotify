using System.ComponentModel.DataAnnotations;

namespace Slotify.Application.Auth;

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password,
    [Required, StringLength(150)] string FullName);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public record RefreshRequest([Required] string RefreshToken);

public record AuthResponse(
    string AccessToken,
    DateTime AccessTokenExpiresUtc,
    string RefreshToken,
    DateTime RefreshTokenExpiresUtc);

public enum AuthStatus { Ok, Invalid, Unauthorized }

public class AuthResult
{
    public AuthStatus Status { get; private init; }
    public AuthResponse? Response { get; private init; }
    public IReadOnlyList<string> Errors { get; private init; } = Array.Empty<string>();

    public static AuthResult Ok(AuthResponse response) =>
        new() { Status = AuthStatus.Ok, Response = response };

    public static AuthResult Invalid(IEnumerable<string> errors) =>
        new() { Status = AuthStatus.Invalid, Errors = errors.ToList() };

    public static AuthResult Unauthorized(string error) =>
        new() { Status = AuthStatus.Unauthorized, Errors = new[] { error } };
}