using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Slotify.Application.Interfaces;

namespace Slotify.Infrastructure.Email;

public class ClientLinks(IOptions<ClientOptions> options) : IClientLinks
{
    private string Base => options.Value.BaseUrl.TrimEnd('/');

    public string MyBookings => $"{Base}/my-bookings";

    // Token iz Identity-ja ima znakove koji ne smeju u URL, pa ga kodiramo (AuthService ga dekodira)
    public string ConfirmEmail(string userId, string token) =>
        $"{Base}/confirm-email?userId={Uri.EscapeDataString(userId)}&token={Base64UrlEncoder.Encode(token)}";

    public string ResetPassword(string userId, string token) =>
        $"{Base}/reset-password?userId={Uri.EscapeDataString(userId)}&token={Base64UrlEncoder.Encode(token)}";
}