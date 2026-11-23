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

public record ConfirmEmailRequest([Required] string UserId, [Required] string Token);

public record EmailRequest([Required, EmailAddress] string Email);

public record ResetPasswordRequest(
    [Required] string UserId,
    [Required] string Token,
    [Required] string NewPassword);

public record ChangePasswordRequest(
    [Required] string CurrentPassword,
    [Required] string NewPassword);

public record DeleteAccountRequest([Required] string Password);

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
    public string? Code { get; private init; }

    public static AuthResult Ok(AuthResponse response) =>
        new() { Status = AuthStatus.Ok, Response = response };

    public static AuthResult Invalid(IEnumerable<string> errors) =>
        new() { Status = AuthStatus.Invalid, Errors = errors.ToList() };

    public static AuthResult Unauthorized(string error, string? code = null) =>
        new() { Status = AuthStatus.Unauthorized, Errors = new[] { error }, Code = code };
}