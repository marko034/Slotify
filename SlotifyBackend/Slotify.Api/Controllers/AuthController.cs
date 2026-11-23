using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Slotify.Application.Auth;
using Slotify.Application.Interfaces;

namespace Slotify.Api.Controllers;

[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController(IAuthService auth, ICurrentUser currentUser) : ApiControllerBase
{
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken ct) =>
        ToNoContent(await auth.RegisterAsync(request, ct));

    [AllowAnonymous]
    [HttpPost("confirm-email")]
    public async Task<IActionResult> ConfirmEmail(ConfirmEmailRequest request, CancellationToken ct) =>
        ToNoContent(await auth.ConfirmEmailAsync(request, ct));

    [AllowAnonymous]
    [HttpPost("resend-confirmation")]
    public async Task<IActionResult> ResendConfirmation(EmailRequest request, CancellationToken ct) =>
        ToNoContent(await auth.ResendConfirmationAsync(request.Email, ct));

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(EmailRequest request, CancellationToken ct) =>
        ToNoContent(await auth.ForgotPasswordAsync(request.Email, ct));

    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken ct) =>
        ToNoContent(await auth.ResetPasswordAsync(request, ct));

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct) =>
        ToActionResult(await auth.LoginAsync(request, ct));

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshRequest request, CancellationToken ct) =>
        ToActionResult(await auth.RefreshAsync(request.RefreshToken, ct));

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken ct)
    {
        await auth.LogoutAsync(request.RefreshToken, ct);
        return NoContent();
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct) =>
        currentUser.UserId is null
            ? Unauthorized()
            : ToActionResult(await auth.ChangePasswordAsync(currentUser.UserId, request, ct));

    [Authorize]
    [HttpPost("delete-account")]
    public async Task<IActionResult> DeleteAccount(DeleteAccountRequest request, CancellationToken ct) =>
        currentUser.UserId is null
            ? Unauthorized()
            : ToNoContent(await auth.DeleteAccountAsync(currentUser.UserId, request.Password, ct));

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me() => Ok(new
    {
        UserId = User.FindFirst("sub")?.Value,
        Email = User.FindFirst("email")?.Value,
        Roles = User.FindAll("role").Select(c => c.Value)
    });

    private IActionResult ToActionResult(AuthResult result) => result.Status switch
    {
        AuthStatus.Ok => Ok(result.Response),
        AuthStatus.Unauthorized => Unauthorized(new { errors = result.Errors, code = result.Code }),
        _ => BadRequest(new { errors = result.Errors })
    };
}