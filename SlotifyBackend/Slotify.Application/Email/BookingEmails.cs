namespace Slotify.Application.Email;

public record BookingEmailModel(
    string VenueName,
    string? VenueAddress,
    string ResourceName,
    DateTimeOffset Start,
    DateTimeOffset End,
    string RecipientName,
    string MyBookingsUrl,
    string? Notes);

public static class BookingEmails
{
    public static EmailContent Confirmed(BookingEmailModel m) => EmailTemplates.Build(
        $"Rezervacija potvrđena: {m.ResourceName}, {EmailFormat.Day(m.Start)}",
        "Rezervacija je potvrđena",
        Lines(m, "Tvoja rezervacija je potvrđena."),
        "Moji termini", m.MyBookingsUrl,
        "Termin možeš da otkažeš u aplikaciji, do roka otkazivanja koji važi za sto.");

    public static EmailContent Cancelled(BookingEmailModel m, bool byVenue) => EmailTemplates.Build(
        $"Rezervacija otkazana: {m.ResourceName}, {EmailFormat.Day(m.Start)}",
        "Rezervacija je otkazana",
        Lines(m, byVenue ? "Sala je otkazala tvoju rezervaciju." : "Tvoja rezervacija je otkazana."),
        "Rezerviši novi termin", m.MyBookingsUrl);

    public static EmailContent Reminder(BookingEmailModel m) => EmailTemplates.Build(
        $"Podsetnik: {m.ResourceName}, {EmailFormat.Day(m.Start)} u {EmailFormat.Time(m.Start)}",
        "Podsetnik za termin",
        Lines(m, $"Podsećamo te na termin koji počinje u {EmailFormat.Time(m.Start)}."),
        "Moji termini", m.MyBookingsUrl);

    private static List<string> Lines(BookingEmailModel m, string intro)
    {
        var venue = string.IsNullOrWhiteSpace(m.VenueAddress) ? m.VenueName : $"{m.VenueName}, {m.VenueAddress}";

        var lines = new List<string>
        {
            $"Zdravo {m.RecipientName},",
            intro,
            $"Sala: {venue}",
            $"Sto: {m.ResourceName}",
            $"Termin: {EmailFormat.When(m.Start, m.End)}"
        };

        if (!string.IsNullOrWhiteSpace(m.Notes))
            lines.Add($"Napomena: {m.Notes}");

        return lines;
    }
}