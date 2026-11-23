using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Slotify.Application.Interfaces;
using Slotify.Application.Common;
using Slotify.Domain.Entities;

namespace Slotify.Application.ResourceTypes;

public record ResourceTypeDto(
    Guid Id, string Name, int SlotMinutes, int MinDurationMinutes, int MaxDurationMinutes,
    int MaxDaysInAdvance, int CancellationDeadlineHours, decimal PricePerHour);

public record ResourceTypeRequest(
    [Required, StringLength(100)] string Name,
    [Range(5, 240)] int SlotMinutes,
    [Range(5, 1440)] int MinDurationMinutes,
    [Range(5, 1440)] int MaxDurationMinutes,
    [Range(1, 365)] int MaxDaysInAdvance,
    [Range(0, 720)] int CancellationDeadlineHours,
    [Range(0, 1000000)] decimal PricePerHour);

public interface IResourceTypeService
{
    Task<ServiceResult<List<ResourceTypeDto>>> ListAsync(CancellationToken ct);
    Task<ServiceResult<ResourceTypeDto>> GetAsync(Guid id, CancellationToken ct);
    Task<ServiceResult<ResourceTypeDto>> CreateAsync(ResourceTypeRequest request, CancellationToken ct);
    Task<ServiceResult<ResourceTypeDto>> UpdateAsync(Guid id, ResourceTypeRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> DeleteAsync(Guid id, CancellationToken ct);
}

public class ResourceTypeService(IAppDbContext db) : IResourceTypeService
{
    public async Task<ServiceResult<List<ResourceTypeDto>>> ListAsync(CancellationToken ct)
    {
        var items = await db.ResourceTypes.OrderBy(x => x.Name).ToListAsync(ct);
        return ServiceResult<List<ResourceTypeDto>>.Ok(items.Select(ToDto).ToList());
    }

    public async Task<ServiceResult<ResourceTypeDto>> GetAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.ResourceTypes.FirstOrDefaultAsync(x => x.Id == id, ct);
        return entity is null
            ? ServiceResult<ResourceTypeDto>.NotFound()
            : ServiceResult<ResourceTypeDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult<ResourceTypeDto>> CreateAsync(ResourceTypeRequest r, CancellationToken ct)
    {
        var errors = Validate(r);
        if (errors.Count > 0)
            return ServiceResult<ResourceTypeDto>.Invalid(errors);

        var entity = new ResourceType { Id = Guid.NewGuid() };
        Apply(entity, r);
        db.ResourceTypes.Add(entity);
        await db.SaveChangesAsync(ct);

        return ServiceResult<ResourceTypeDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult<ResourceTypeDto>> UpdateAsync(Guid id, ResourceTypeRequest r, CancellationToken ct)
    {
        var errors = Validate(r);
        if (errors.Count > 0)
            return ServiceResult<ResourceTypeDto>.Invalid(errors);

        var entity = await db.ResourceTypes.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null)
            return ServiceResult<ResourceTypeDto>.NotFound();

        Apply(entity, r);
        await db.SaveChangesAsync(ct);

        return ServiceResult<ResourceTypeDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.ResourceTypes.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null)
            return ServiceResult<bool>.NotFound();

        if (await db.Resources.AnyAsync(x => x.ResourceTypeId == id, ct))
            return ServiceResult<bool>.Conflict("Tip se koristi na stolovima, prvo ih obriši ili prebaci na drugi tip.");

        db.ResourceTypes.Remove(entity);
        await db.SaveChangesAsync(ct);
        return ServiceResult<bool>.Ok(true);
    }

    private static List<string> Validate(ResourceTypeRequest r)
    {
        var errors = new List<string>();

        if (r.MinDurationMinutes < r.SlotMinutes || r.MinDurationMinutes % r.SlotMinutes != 0)
            errors.Add("Minimalno trajanje mora biti umnožak dužine slota.");

        if (r.MaxDurationMinutes < r.MinDurationMinutes || r.MaxDurationMinutes % r.SlotMinutes != 0)
            errors.Add("Maksimalno trajanje mora biti umnožak dužine slota i ne manje od minimalnog.");

        return errors;
    }

    private static void Apply(ResourceType e, ResourceTypeRequest r)
    {
        e.Name = r.Name.Trim();
        e.SlotMinutes = r.SlotMinutes;
        e.MinDurationMinutes = r.MinDurationMinutes;
        e.MaxDurationMinutes = r.MaxDurationMinutes;
        e.MaxDaysInAdvance = r.MaxDaysInAdvance;
        e.CancellationDeadlineHours = r.CancellationDeadlineHours;
        e.PricePerHour = r.PricePerHour;
    }

    private static ResourceTypeDto ToDto(ResourceType e) => new(
        e.Id, e.Name, e.SlotMinutes, e.MinDurationMinutes, e.MaxDurationMinutes,
        e.MaxDaysInAdvance, e.CancellationDeadlineHours, e.PricePerHour);
}