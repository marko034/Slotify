namespace Slotify.Application.Interfaces;

public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string htmlBody, string textBody, CancellationToken ct);
}