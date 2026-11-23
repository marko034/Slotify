using Microsoft.EntityFrameworkCore;
using Slotify.Application.Interfaces;
using Slotify.Application.Email;
using Slotify.Domain.Entities;
using Slotify.Domain.Enums;

namespace Slotify.Application.Bookings;

public class BookingNotifier(
    IAppDbContext db,
    IUserDirectory directory,
    IEmailOutbox outbox,
    IClientLinks links)
{
    public async Task QueueConfirmedAsync(Booking booking, string resourceName, CancellationToken ct)
    {
        var target = await BuildAsync(booking, resourceName, ct);
        if (target is null) return;

        outbox.Enqueue(target.Value.Email, BookingEmails.Confirmed(target.Value.Model));
    }

    public async Task QueueCancelledAsync(Booking booking, string resourceName, bool byVenue, CancellationToken ct)
    {
        var target = await BuildAsync(booking, resourceName, ct);
        if (target is null) return;

        outbox.Enqueue(target.Value.Email, BookingEmails.Cancelled(target.Value.Model, byVenue));
    }

    // Gosti nemaju nalog, a blokade nemaju korisnika, pa za njih nema mejla
    private async Task<(string Email, BookingEmailModel Model)?> BuildAsync(
        Booking booking, string resourceName, CancellationToken ct)
    {
        if (booking.Kind != BookingKind.Reservation || booking.UserId is null)
            return null;

        var contacts = await directory.GetContactsAsync(new[] { booking.UserId }, ct);
        if (!contacts.TryGetValue(booking.UserId, out var contact))
            return null;

        var venue = await db.Venues.FirstAsync(v => v.Id == Venue.DefaultId, ct);
        var tz = TimeZoneInfo.FindSystemTimeZoneById(venue.TimeZoneId);

        var model = new BookingEmailModel(
            venue.Name,
            venue.Address,
            resourceName,
            BookingCalendar.ToLocal(booking.StartUtc, tz),
            BookingCalendar.ToLocal(booking.EndUtc, tz),
            contact.FullName,
            links.MyBookings,
            booking.Notes);

        return (contact.Email, model);
    }
}