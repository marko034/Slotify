using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Slotify.Application.Interfaces;
using Slotify.Application.Common;
using Slotify.Domain.Entities;

namespace Slotify.Application.OpeningHoursSettings;

public record OpeningHoursDto(DayOfWeek DayOfWeek, TimeOnly OpenTime, TimeOnly CloseTime);

public record SetOpeningHoursRequest([Required] List<OpeningHoursDto> Days);

public interface IOpeningHoursService
{
    Task<ServiceResult<List<OpeningHoursDto>>> GetAsync(CancellationToken ct);
    Task<ServiceResult<List<OpeningHoursDto>>> SetAsync(SetOpeningHoursRequest request, CancellationToken ct);
}

public class OpeningHoursService(IAppDbContext db) : IOpeningHoursService
{
    public async Task<ServiceResult<List<OpeningHoursDto>>> GetAsync(CancellationToken ct)
    {
        var items = await db.OpeningHours.ToListAsync(ct);
        return ServiceResult<List<OpeningHoursDto>>.Ok(ToDtos(items));
    }

    public async Task<ServiceResult<List<OpeningHoursDto>>> SetAsync(SetOpeningHoursRequest r, CancellationToken ct)
    {
        var errors = new List<string>();

        if (r.Days.GroupBy(d => d.DayOfWeek).Any(g => g.Count() > 1))
            errors.Add("Isti dan je naveden više puta.");

        if (r.Days.Any(d => d.CloseTime <= d.OpenTime))
            errors.Add("Vreme zatvaranja mora biti posle vremena otvaranja.");

        if (errors.Count > 0)
            return ServiceResult<List<OpeningHoursDto>>.Invalid(errors);

        var existing = await db.OpeningHours.ToListAsync(ct);

        foreach (var e in existing.Where(e => r.Days.All(d => d.DayOfWeek != e.DayOfWeek)))
            db.OpeningHours.Remove(e);

        foreach (var d in r.Days)
        {
            var e = existing.FirstOrDefault(x => x.DayOfWeek == d.DayOfWeek);
            if (e is null)
            {
                db.OpeningHours.Add(new Domain.Entities.OpeningHours
                {
                    Id = Guid.NewGuid(),
                    DayOfWeek = d.DayOfWeek,
                    OpenTime = d.OpenTime,
                    CloseTime = d.CloseTime
                });
            }
            else
            {
                e.OpenTime = d.OpenTime;
                e.CloseTime = d.CloseTime;
            }
        }

        await db.SaveChangesAsync(ct);

        var saved = await db.OpeningHours.ToListAsync(ct);
        return ServiceResult<List<OpeningHoursDto>>.Ok(ToDtos(saved));
    }

    // Ponedeljak prvi
    private static List<OpeningHoursDto> ToDtos(IEnumerable<OpeningHours> items) =>
        items.OrderBy(x => ((int)x.DayOfWeek + 6) % 7)
             .Select(x => new OpeningHoursDto(x.DayOfWeek, x.OpenTime, x.CloseTime))
             .ToList();
}