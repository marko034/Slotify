namespace Slotify.Application.Interfaces;

public interface IClientLinks
{
    string MyBookings { get; }
    string ConfirmEmail(string userId, string token);
    string ResetPassword(string userId, string token);
}