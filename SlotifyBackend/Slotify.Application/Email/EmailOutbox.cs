using Slotify.Application.Interfaces;
using Slotify.Domain.Entities;

namespace Slotify.Application.Email;

public interface IEmailOutbox
{
    /// Samo dodaje u kontekst. Upis se dešava u SaveChanges pozivaoca, zajedno sa njegovim izmenama.
    void Enqueue(string toEmail, EmailContent content);
}

public class EmailOutbox(IAppDbContext db, TimeProvider clock) : IEmailOutbox
{
    public void Enqueue(string toEmail, EmailContent content)
    {
        var now = clock.GetUtcNow().UtcDateTime;

        db.EmailMessages.Add(new EmailMessage
        {
            Id = Guid.NewGuid(),
            ToEmail = toEmail,
            Subject = content.Subject,
            HtmlBody = content.Html,
            TextBody = content.Text,
            CreatedUtc = now,
            NextAttemptUtc = now
        });
    }
}