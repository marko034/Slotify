using MailKit.Security;

namespace Slotify.Infrastructure.Email;

public class EmailOptions
{
    public const string SectionName = "Email";

    public bool Enabled { get; set; }
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public SecureSocketOptions Security { get; set; } = SecureSocketOptions.Auto;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string FromAddress { get; set; } = "";
    public string FromName { get; set; } = "Slotify";
}

public class ClientOptions
{
    public const string SectionName = "Client";

    /// Adresa klijenta, npr. https://app.slotify.rs (bez kose crte na kraju)
    public string BaseUrl { get; set; } = "";
}

public class ReminderOptions
{
    public const string SectionName = "Reminders";

    public bool Enabled { get; set; }
    public int LeadHours { get; set; } = 3;
}