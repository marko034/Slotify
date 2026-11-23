namespace Slotify.Domain.Entities;

public class EmailMessage
{
    public Guid Id { get; set; }
    public string ToEmail { get; set; } = "";
    public string Subject { get; set; } = "";
    public string HtmlBody { get; set; } = "";
    public string TextBody { get; set; } = "";
    public DateTime CreatedUtc { get; set; }
    public DateTime NextAttemptUtc { get; set; }
    public DateTime? SentUtc { get; set; }
    public int Attempts { get; set; }      // broj neuspelih pokušaja
    public string? LastError { get; set; }
}