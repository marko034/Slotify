using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Slotify.Application.Interfaces;
using Slotify.Application.Common;
using Slotify.Domain.Entities;

namespace Slotify.Application.Venues;

public record VenueDto(string Name, string? Address, string TimeZoneId);

public record UpdateVenueRequest(
    [Required, StringLength(200)] string Name,
    [StringLength(300)] string? Address,
    [Required] string TimeZoneId);

public interface IVenueService
{
    Task<ServiceResult<VenueDto>> GetAsync(CancellationToken ct);
    Task<ServiceResult<VenueDto>> UpdateAsync(UpdateVenueRequest request, CancellationToken ct);
}

public class VenueService(IAppDbContext db) : IVenueService
{
    public async Task<ServiceResult<VenueDto>> GetAsync(CancellationToken ct)
    {
        var venue = await db.Venues.FirstOrDefaultAsync(v => v.Id == Venue.DefaultId, ct);
        return venue is null
            ? ServiceResult<VenueDto>.NotFound()
            : ServiceResult<VenueDto>.Ok(ToDto(venue));
    }

    public async Task<ServiceResult<VenueDto>> UpdateAsync(UpdateVenueRequest r, CancellationToken ct)
    {
        if (!TimeZoneInfo.TryFindSystemTimeZoneById(r.TimeZoneId, out _))
            return ServiceResult<VenueDto>.Invalid("Nepoznata vremenska zona.");

        var venue = await db.Venues.FirstOrDefaultAsync(v => v.Id == Venue.DefaultId, ct);
        if (venue is null)
            return ServiceResult<VenueDto>.NotFound();

        venue.Name = r.Name.Trim();
        venue.Address = string.IsNullOrWhiteSpace(r.Address) ? null : r.Address.Trim();
        venue.TimeZoneId = r.TimeZoneId;
        await db.SaveChangesAsync(ct);

        return ServiceResult<VenueDto>.Ok(ToDto(venue));
    }

    private static VenueDto ToDto(Venue v) => new(v.Name, v.Address, v.TimeZoneId);
}