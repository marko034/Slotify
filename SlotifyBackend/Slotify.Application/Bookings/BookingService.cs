using Microsoft.EntityFrameworkCore;
using Slotify.Application.Abstractions;
using Slotify.Application.Common;
using Slotify.Application.Interfaces;
using Slotify.Domain.Entities;
using Slotify.Domain.Enums;

namespace Slotify.Application.Bookings;

public interface IBookingService
{
    Task<ServiceResult<BookingDto>> CreateAsync(CreateBookingRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> CancelAsync(Guid id, CancellationToken ct);
    Task<ServiceResult<List<BookingDto>>> ListMineAsync(bool includePast, CancellationToken ct);
}

public class BookingService(IAppDbContext db, ICurrentUser user, TimeProvider clock) : IBookingService
{
    public async Task<ServiceResult<BookingDto>> CreateAsync(CreateBookingRequest r, CancellationToken ct)
    {
        if (user.UserId is null)
            return ServiceResult<BookingDto>.Forbidden("Niste prijavljeni.");

        var guestName = string.IsNullOrWhiteSpace(r.GuestName) ? null : r.GuestName.Trim();
        var guestPhone = string.IsNullOrWhiteSpace(r.GuestPhone) ? null : r.GuestPhone.Trim();
        var forGuest = guestName is not null || guestPhone is not null;

        if (forGuest && !user.IsStaff)
            return ServiceResult<BookingDto>.Forbidden("Samo osoblje može da unosi rezervacije za goste.");

        if (forGuest && guestName is null)
            return ServiceResult<BookingDto>.Invalid("Ime gosta je obavezno.");

        var resource = await db.Resources.FirstOrDefaultAsync(x => x.Id == r.ResourceId, ct);
        if (resource is null || !resource.IsActive)
            return ServiceResult<BookingDto>.Invalid("Sto ne postoji ili nije aktivan.");

        var type = await db.ResourceTypes.FirstAsync(t => t.Id == resource.ResourceTypeId, ct);
        var tz = await BookingCalendar.GetVenueTimeZoneAsync(db, ct);

        if (r.DurationMinutes < type.MinDurationMinutes
            || r.DurationMinutes > type.MaxDurationMinutes
            || r.DurationMinutes % type.SlotMinutes != 0)
        {
            return ServiceResult<BookingDto>.Invalid(
                $"Trajanje mora biti između {type.MinDurationMinutes} i {type.MaxDurationMinutes} minuta, " +
                $"u koracima od {type.SlotMinutes}.");
        }

        var startUtc = r.Start.UtcDateTime;
        var endUtc = startUtc.AddMinutes(r.DurationMinutes);
        var nowUtc = clock.GetUtcNow().UtcDateTime;

        if (startUtc <= nowUtc)
            return ServiceResult<BookingDto>.Invalid("Termin je u prošlosti.");

        var localDate = BookingCalendar.LocalDate(startUtc, tz);
        var today = BookingCalendar.LocalDate(nowUtc, tz);

        if (localDate > today.AddDays(type.MaxDaysInAdvance))
            return ServiceResult<BookingDto>.Invalid(
                $"Rezervacija je moguća najviše {type.MaxDaysInAdvance} dana unapred.");

        var hours = await db.OpeningHours.FirstOrDefaultAsync(h => h.DayOfWeek == localDate.DayOfWeek, ct);
        if (hours is null)
            return ServiceResult<BookingDto>.Invalid("Sala ne radi tog dana.");

        var (openUtc, closeUtc) = BookingCalendar.GetWindow(localDate, hours, tz);

        if (startUtc < openUtc || endUtc > closeUtc)
            return ServiceResult<BookingDto>.Invalid("Termin je van radnog vremena.");

        var slotTicks = TimeSpan.FromMinutes(type.SlotMinutes).Ticks;
        if ((startUtc - openUtc).Ticks % slotTicks != 0)
            return ServiceResult<BookingDto>.Invalid(
                $"Početak mora biti na granici termina od {type.SlotMinutes} minuta, računato od otvaranja.");

        var taken = await db.Bookings.AnyAsync(b =>
            b.ResourceId == resource.Id
            && b.Status != BookingStatus.Cancelled
            && b.StartUtc < endUtc
            && b.EndUtc > startUtc, ct);

        if (taken)
            return ServiceResult<BookingDto>.Conflict("Termin je već zauzet.");

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            ResourceId = resource.Id,
            StartUtc = startUtc,
            EndUtc = endUtc,
            Status = BookingStatus.Confirmed,
            Kind = BookingKind.Reservation,
            UserId = forGuest ? null : user.UserId,
            GuestName = guestName,
            GuestPhone = guestPhone,
            Notes = string.IsNullOrWhiteSpace(r.Notes) ? null : r.Notes.Trim(),
            CreatedUtc = nowUtc
        };

        db.Bookings.Add(booking);

        await db.SaveChangesAsync(ct);

        return ServiceResult<BookingDto>.Ok(ToDto(booking, resource.Name, tz));
    }

    public async Task<ServiceResult<bool>> CancelAsync(Guid id, CancellationToken ct)
    {
        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.Id == id, ct);

        // Igrač za tuđu rezervaciju dobija 404, da ne otkrivamo šta postoji
        if (booking is null || (!user.IsStaff && booking.UserId != user.UserId))
            return ServiceResult<bool>.NotFound();

        if (booking.Status == BookingStatus.Cancelled)
            return ServiceResult<bool>.Ok(true);

        if (!user.IsStaff)
        {
            var nowUtc = clock.GetUtcNow().UtcDateTime;

            if (booking.StartUtc <= nowUtc)
                return ServiceResult<bool>.Invalid("Termin je već počeo.");

            var deadlineHours = await (
                from r in db.Resources
                join t in db.ResourceTypes on r.ResourceTypeId equals t.Id
                where r.Id == booking.ResourceId
                select t.CancellationDeadlineHours).FirstAsync(ct);

            if (booking.StartUtc - nowUtc < TimeSpan.FromHours(deadlineHours))
                return ServiceResult<bool>.Invalid(
                    $"Otkazivanje je moguće najkasnije {deadlineHours} h pre početka.");
        }

        booking.Status = BookingStatus.Cancelled;
        await db.SaveChangesAsync(ct);
        return ServiceResult<bool>.Ok(true);
    }

    public async Task<ServiceResult<List<BookingDto>>> ListMineAsync(bool includePast, CancellationToken ct)
    {
        if (user.UserId is null)
            return ServiceResult<List<BookingDto>>.Forbidden("Niste prijavljeni.");

        var userId = user.UserId;
        var nowUtc = clock.GetUtcNow().UtcDateTime;

        var query = db.Bookings.Where(b => b.UserId == userId);
        if (!includePast)
            query = query.Where(b => b.EndUtc > nowUtc && b.Status != BookingStatus.Cancelled);

        var items = await query.OrderBy(b => b.StartUtc).ToListAsync(ct);

        var tz = await BookingCalendar.GetVenueTimeZoneAsync(db, ct);
        var resourceIds = items.Select(i => i.ResourceId).Distinct().ToList();
        var names = await db.Resources
            .Where(r => resourceIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id, r => r.Name, ct);

        var dtos = items.Select(b => ToDto(b, names.GetValueOrDefault(b.ResourceId, ""), tz)).ToList();
        return ServiceResult<List<BookingDto>>.Ok(dtos);
    }

    private static BookingDto ToDto(Booking b, string resourceName, TimeZoneInfo tz) => new(
        b.Id, b.ResourceId, resourceName,
        BookingCalendar.ToLocal(b.StartUtc, tz),
        BookingCalendar.ToLocal(b.EndUtc, tz),
        b.Status, b.Kind, b.GuestName, b.GuestPhone, b.Notes);
}