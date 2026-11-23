using Slotify.Application.Common;

namespace Slotify.Application.Auth;

public interface IAuthService
{
    Task<ServiceResult<bool>> RegisterAsync(RegisterRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> ConfirmEmailAsync(ConfirmEmailRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> ResendConfirmationAsync(string email, CancellationToken ct);
    Task<ServiceResult<bool>> ForgotPasswordAsync(string email, CancellationToken ct);
    Task<ServiceResult<bool>> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct);

    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken ct);
    Task<AuthResult> RefreshAsync(string refreshToken, CancellationToken ct);
    Task LogoutAsync(string refreshToken, CancellationToken ct);

    Task<AuthResult> ChangePasswordAsync(string userId, ChangePasswordRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> DeleteAccountAsync(string userId, string password, CancellationToken ct);
}