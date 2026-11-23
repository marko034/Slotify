using Microsoft.EntityFrameworkCore;
using Slotify.Application.Interfaces;
using Slotify.Application.Email;
using Slotify.Domain.Entities;
using Slotify.Domain.Enums;

namespace Slotify.Application.Bookings;

public interface IReminderService
{
    /// Vraća broj stvarno poslatih podsetnika.
    Task<int> QueueDueAsync(TimeSpan lead, CancellationToken ct);
}

public class ReminderService(
    IAppDbContext db,
    IUserDirectory directory,
    IEmailOutbox outbox,
    IClientLinks links,
    TimeProvider clock) : IReminderService
{
    public async Task<int> QueueDueAsync(TimeSpan lead, CancellationToken ct)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var horizon = now + lead;

        var due = await db.Bookings
            .Where(b => b.Kind == BookingKind.Reservation
                        && b.Status == BookingStatus.Confirmed
                        && b.UserId != null
                        && b.ReminderSentUtc == null
                        && b.StartUtc > now
                        && b.StartUtc <= horizon)
            .OrderBy(b => b.StartUtc)
            .Take(200)
            .ToListAsync(ct);

        if (due.Count == 0) return 0;

        var venue = await db.Venues.FirstAsync(v => v.Id == Venue.DefaultId, ct);
        var tz = TimeZoneInfo.FindSystemTimeZoneById(venue.TimeZoneId);

        var contacts = await directory.GetContactsAsync(due.Select(b => b.UserId!).Distinct().ToList(), ct);

        var resourceIds = due.Select(b => b.ResourceId).Distinct().ToList();
        var resourceNames = await db.Resources
            .Where(r => resourceIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id, r => r.Name, ct);

        var sent = 0;
        foreach (var b in due)
        {
            b.ReminderSentUtc = now;

            // Rezervacija napravljena unutar prozora već ima potvrdu, pa podsetnik ne šaljemo
            if (b.CreatedUtc >= b.StartUtc - lead) continue;
            if (!contacts.TryGetValue(b.UserId!, out var contact)) continue;

            var model = new BookingEmailModel(
                venue.Name,
                venue.Address,
                resourceNames.GetValueOrDefault(b.ResourceId, ""),
                BookingCalendar.ToLocal(b.StartUtc, tz),
                BookingCalendar.ToLocal(b.EndUtc, tz),
                contact.FullName,
                links.MyBookings,
                b.Notes);

            outbox.Enqueue(contact.Email, BookingEmails.Reminder(model));
            sent++;
        }

        await db.SaveChangesAsync(ct);
        return sent;
    }
}