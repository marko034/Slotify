using Microsoft.EntityFrameworkCore;
using Slotify.Application.Abstractions;
using Slotify.Domain.Entities;

namespace Slotify.Application.Bookings;

internal static class BookingCalendar
{
    public static async Task<TimeZoneInfo> GetVenueTimeZoneAsync(IAppDbContext db, CancellationToken ct)
    {
        var id = await db.Venues
            .Where(v => v.Id == Venue.DefaultId)
            .Select(v => v.TimeZoneId)
            .FirstOrDefaultAsync(ct);

        return TimeZoneInfo.FindSystemTimeZoneById(id ?? "Europe/Belgrade");
    }

    // Lokalno vreme sale -> UTC. Ako vreme ne postoji (preskok na letnje računanje), pomera za sat.
    public static DateTime ToUtc(DateOnly date, TimeOnly time, TimeZoneInfo tz)
    {
        var local = date.ToDateTime(time, DateTimeKind.Unspecified);
        if (tz.IsInvalidTime(local))
            local = local.AddHours(1);

        return TimeZoneInfo.ConvertTimeToUtc(local, tz);
    }

    public static (DateTime OpenUtc, DateTime CloseUtc) GetWindow(DateOnly date, OpeningHours hours, TimeZoneInfo tz) =>
        (ToUtc(date, hours.OpenTime, tz), ToUtc(date, hours.CloseTime, tz));

    public static DateOnly LocalDate(DateTime utc, TimeZoneInfo tz) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), tz));

    public static DateTimeOffset ToLocal(DateTime utc, TimeZoneInfo tz) =>
        TimeZoneInfo.ConvertTime(new DateTimeOffset(DateTime.SpecifyKind(utc, DateTimeKind.Utc)), tz);
}