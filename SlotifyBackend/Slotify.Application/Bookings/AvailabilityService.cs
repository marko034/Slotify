using Microsoft.EntityFrameworkCore;
using Slotify.Application.Interfaces;
using Slotify.Application.Common;
using Slotify.Domain.Enums;

namespace Slotify.Application.Bookings;

public interface IAvailabilityService
{
    Task<ServiceResult<AvailabilityDto>> GetAsync(DateOnly date, Guid resourceTypeId, CancellationToken ct);
}

public class AvailabilityService(IAppDbContext db, TimeProvider clock) : IAvailabilityService
{
    public async Task<ServiceResult<AvailabilityDto>> GetAsync(DateOnly date, Guid resourceTypeId, CancellationToken ct)
    {
        var type = await db.ResourceTypes.FirstOrDefaultAsync(t => t.Id == resourceTypeId, ct);
        if (type is null)
            return ServiceResult<AvailabilityDto>.NotFound();

        var tz = await BookingCalendar.GetVenueTimeZoneAsync(db, ct);
        var nowUtc = clock.GetUtcNow().UtcDateTime;
        var today = BookingCalendar.LocalDate(nowUtc, tz);

        if (date < today)
            return ServiceResult<AvailabilityDto>.Invalid("Datum je u prošlosti.");

        if (date > today.AddDays(type.MaxDaysInAdvance))
            return ServiceResult<AvailabilityDto>.Invalid(
                $"Rezervacija je moguća najviše {type.MaxDaysInAdvance} dana unapred.");

        var resources = await db.Resources
            .Where(r => r.ResourceTypeId == type.Id && r.IsActive)
            .OrderBy(r => r.Name)
            .ToListAsync(ct);

        var result = resources
            .Select(r => new ResourceAvailabilityDto(r.Id, r.Name, new List<AvailabilityStartDto>()))
            .ToList();

        var dto = new AvailabilityDto(date, tz.Id, type.SlotMinutes, type.MinDurationMinutes,
            type.MaxDurationMinutes, result);

        var hours = await db.OpeningHours.FirstOrDefaultAsync(h => h.DayOfWeek == date.DayOfWeek, ct);
        if (hours is null || resources.Count == 0)
            return ServiceResult<AvailabilityDto>.Ok(dto); // sala ne radi tog dana

        var (openUtc, closeUtc) = BookingCalendar.GetWindow(date, hours, tz);

        var resourceIds = resources.Select(r => r.Id).ToList();
        var busy = await db.Bookings
            .Where(b => resourceIds.Contains(b.ResourceId)
                        && b.Status != BookingStatus.Cancelled
                        && b.StartUtc < closeUtc
                        && b.EndUtc > openUtc)
            .Select(b => new { b.ResourceId, b.StartUtc, b.EndUtc })
            .ToListAsync(ct);

        var slot = TimeSpan.FromMinutes(type.SlotMinutes);
        var slotStarts = new List<DateTime>();
        for (var s = openUtc; s + slot <= closeUtc; s += slot)
            slotStarts.Add(s);

        var minSlots = type.MinDurationMinutes / type.SlotMinutes;
        var maxSlots = type.MaxDurationMinutes / type.SlotMinutes;

        foreach (var resource in result)
        {
            var mine = busy.Where(b => b.ResourceId == resource.ResourceId).ToList();

            var free = slotStarts
                .Select(s => s > nowUtc && !mine.Any(b => b.StartUtc < s + slot && b.EndUtc > s))
                .ToArray();

            var run = new int[free.Length + 1];
            for (var i = free.Length - 1; i >= 0; i--)
                run[i] = free[i] ? run[i + 1] + 1 : 0;

            for (var i = 0; i < free.Length; i++)
            {
                if (run[i] < minSlots) continue;

                resource.Starts.Add(new AvailabilityStartDto(
                    BookingCalendar.ToLocal(slotStarts[i], tz),
                    Math.Min(run[i], maxSlots) * type.SlotMinutes));
            }
        }

        return ServiceResult<AvailabilityDto>.Ok(dto);
    }
}