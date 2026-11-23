using Microsoft.EntityFrameworkCore;
using Slotify.Application.Interfaces;
using Slotify.Application.Common;
using Slotify.Application.Interfaces;
using Slotify.Domain.Entities;
using Slotify.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace Slotify.Application.Bookings;

public record StaffBookingDto(
    Guid Id, Guid ResourceId, string ResourceName,
    DateTimeOffset Start, DateTimeOffset End,
    BookingStatus Status, BookingKind Kind,
    string? UserId, string? DisplayName,
    string? GuestName, string? GuestPhone, string? Notes);

public record CreateBlockRequest(
    Guid? ResourceId,
    [Required] DateTimeOffset Start,
    [Required] DateTimeOffset End,
    [StringLength(500)] string? Notes);

public interface IStaffBookingService
{
    Task<ServiceResult<List<StaffBookingDto>>> ListForDayAsync(DateOnly date, bool includeCancelled, CancellationToken ct);
    Task<ServiceResult<List<StaffBookingDto>>> CreateBlockAsync(CreateBlockRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> MarkNoShowAsync(Guid id, CancellationToken ct);
}

public class StaffBookingService(IAppDbContext db, IUserDirectory directory, TimeProvider clock)
    : IStaffBookingService
{
    public async Task<ServiceResult<List<StaffBookingDto>>> ListForDayAsync(
        DateOnly date, bool includeCancelled, CancellationToken ct)
    {
        var tz = await BookingCalendar.GetVenueTimeZoneAsync(db, ct);
        var fromUtc = BookingCalendar.ToUtc(date, TimeOnly.MinValue, tz);
        var toUtc = BookingCalendar.ToUtc(date.AddDays(1), TimeOnly.MinValue, tz);

        var query = db.Bookings.Where(b => b.StartUtc < toUtc && b.EndUtc > fromUtc);
        if (!includeCancelled)
            query = query.Where(b => b.Status != BookingStatus.Cancelled);

        var items = await query.OrderBy(b => b.StartUtc).ToListAsync(ct);
        return ServiceResult<List<StaffBookingDto>>.Ok(await ToDtosAsync(items, tz, ct));
    }

    public async Task<ServiceResult<List<StaffBookingDto>>> CreateBlockAsync(
        CreateBlockRequest r, CancellationToken ct)
    {
        if (r.End <= r.Start)
            return ServiceResult<List<StaffBookingDto>>.Invalid("Kraj mora biti posle početka.");

        var startUtc = r.Start.UtcDateTime;
        var endUtc = r.End.UtcDateTime;
        var nowUtc = clock.GetUtcNow().UtcDateTime;

        if (endUtc <= nowUtc)
            return ServiceResult<List<StaffBookingDto>>.Invalid("Blokada je u prošlosti.");

        List<Resource> targets;
        if (r.ResourceId is { } resourceId)
        {
            var one = await db.Resources.FirstOrDefaultAsync(x => x.Id == resourceId, ct);
            if (one is null)
                return ServiceResult<List<StaffBookingDto>>.Invalid("Sto ne postoji.");
            targets = new List<Resource> { one };
        }
        else
        {
            targets = await db.Resources.Where(x => x.IsActive).ToListAsync(ct);
            if (targets.Count == 0)
                return ServiceResult<List<StaffBookingDto>>.Invalid("Nema aktivnih stolova.");
        }

        var targetIds = targets.Select(t => t.Id).ToList();
        var clashes = await db.Bookings.CountAsync(b =>
            targetIds.Contains(b.ResourceId)
            && b.Status != BookingStatus.Cancelled
            && b.StartUtc < endUtc
            && b.EndUtc > startUtc, ct);

        if (clashes > 0)
            return ServiceResult<List<StaffBookingDto>>.Conflict(
                $"U tom periodu postoji rezervacija ili blokada ({clashes}). Prvo ih otkaži.");

        var notes = string.IsNullOrWhiteSpace(r.Notes) ? null : r.Notes.Trim();
        var blocks = targets.Select(t => new Booking
        {
            Id = Guid.NewGuid(),
            ResourceId = t.Id,
            StartUtc = startUtc,
            EndUtc = endUtc,
            Status = BookingStatus.Confirmed,
            Kind = BookingKind.Block,
            Notes = notes,
            CreatedUtc = nowUtc
        }).ToList();

        db.Bookings.AddRange(blocks);

        await db.SaveChangesAsync(ct);

        var tz = await BookingCalendar.GetVenueTimeZoneAsync(db, ct);
        return ServiceResult<List<StaffBookingDto>>.Ok(await ToDtosAsync(blocks, tz, ct));
    }

    public async Task<ServiceResult<bool>> MarkNoShowAsync(Guid id, CancellationToken ct)
    {
        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null)
            return ServiceResult<bool>.NotFound();

        if (booking.Kind != BookingKind.Reservation || booking.Status != BookingStatus.Confirmed)
            return ServiceResult<bool>.Invalid("Samo potvrđena rezervacija može da se označi kao propuštena.");

        if (booking.StartUtc > clock.GetUtcNow().UtcDateTime)
            return ServiceResult<bool>.Invalid("Termin još nije počeo.");

        booking.Status = BookingStatus.NoShow;
        await db.SaveChangesAsync(ct);
        return ServiceResult<bool>.Ok(true);
    }

    private async Task<List<StaffBookingDto>> ToDtosAsync(
        List<Booking> items, TimeZoneInfo tz, CancellationToken ct)
    {
        var resourceIds = items.Select(i => i.ResourceId).Distinct().ToList();
        var resourceNames = await db.Resources
            .Where(r => resourceIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id, r => r.Name, ct);

        var userIds = items.Where(i => i.UserId != null).Select(i => i.UserId!).Distinct().ToList();
        var userNames = userIds.Count == 0
            ? new Dictionary<string, string>()
            : await directory.GetDisplayNamesAsync(userIds, ct);

        return items.Select(b => new StaffBookingDto(
            b.Id, b.ResourceId, resourceNames.GetValueOrDefault(b.ResourceId, ""),
            BookingCalendar.ToLocal(b.StartUtc, tz),
            BookingCalendar.ToLocal(b.EndUtc, tz),
            b.Status, b.Kind,
            b.UserId,
            b.UserId is null ? null : userNames.GetValueOrDefault(b.UserId),
            b.GuestName, b.GuestPhone, b.Notes)).ToList();
    }
}