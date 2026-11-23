using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Slotify.Application.Interfaces;
using Slotify.Application.Common;
using Slotify.Domain.Entities;

namespace Slotify.Application.Resources;

public record ResourceDto(Guid Id, Guid ResourceTypeId, string Name, bool IsActive);

public record ResourceRequest(
    [Required] Guid ResourceTypeId,
    [Required, StringLength(100)] string Name,
    bool IsActive = true);

public interface IResourceService
{
    Task<ServiceResult<List<ResourceDto>>> ListAsync(CancellationToken ct);
    Task<ServiceResult<ResourceDto>> GetAsync(Guid id, CancellationToken ct);
    Task<ServiceResult<ResourceDto>> CreateAsync(ResourceRequest request, CancellationToken ct);
    Task<ServiceResult<ResourceDto>> UpdateAsync(Guid id, ResourceRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> DeleteAsync(Guid id, CancellationToken ct);
}

public class ResourceService(IAppDbContext db) : IResourceService
{
    public async Task<ServiceResult<List<ResourceDto>>> ListAsync(CancellationToken ct)
    {
        var items = await db.Resources.OrderBy(x => x.Name).ToListAsync(ct);
        return ServiceResult<List<ResourceDto>>.Ok(items.Select(ToDto).ToList());
    }

    public async Task<ServiceResult<ResourceDto>> GetAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Resources.FirstOrDefaultAsync(x => x.Id == id, ct);
        return entity is null
            ? ServiceResult<ResourceDto>.NotFound()
            : ServiceResult<ResourceDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult<ResourceDto>> CreateAsync(ResourceRequest r, CancellationToken ct)
    {
        var name = r.Name.Trim();

        if (!await db.ResourceTypes.AnyAsync(x => x.Id == r.ResourceTypeId, ct))
            return ServiceResult<ResourceDto>.Invalid("Tip stola ne postoji.");

        if (await db.Resources.AnyAsync(x => x.Name == name, ct))
            return ServiceResult<ResourceDto>.Conflict("Sto sa tim nazivom već postoji.");

        var entity = new Resource
        {
            Id = Guid.NewGuid(),
            ResourceTypeId = r.ResourceTypeId,
            Name = name,
            IsActive = r.IsActive
        };
        db.Resources.Add(entity);
        await db.SaveChangesAsync(ct);

        return ServiceResult<ResourceDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult<ResourceDto>> UpdateAsync(Guid id, ResourceRequest r, CancellationToken ct)
    {
        var entity = await db.Resources.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null)
            return ServiceResult<ResourceDto>.NotFound();

        var name = r.Name.Trim();

        if (!await db.ResourceTypes.AnyAsync(x => x.Id == r.ResourceTypeId, ct))
            return ServiceResult<ResourceDto>.Invalid("Tip stola ne postoji.");

        if (await db.Resources.AnyAsync(x => x.Name == name && x.Id != id, ct))
            return ServiceResult<ResourceDto>.Conflict("Sto sa tim nazivom već postoji.");

        entity.ResourceTypeId = r.ResourceTypeId;
        entity.Name = name;
        entity.IsActive = r.IsActive;
        await db.SaveChangesAsync(ct);

        return ServiceResult<ResourceDto>.Ok(ToDto(entity));
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Resources.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null)
            return ServiceResult<bool>.NotFound();

        if (await db.Bookings.AnyAsync(b => b.ResourceId == id, ct))
            return ServiceResult<bool>.Conflict("Sto ima rezervacije. Deaktiviraj ga umesto brisanja.");

        db.Resources.Remove(entity);
        await db.SaveChangesAsync(ct);
        return ServiceResult<bool>.Ok(true);
    }

    private static ResourceDto ToDto(Resource e) => new(e.Id, e.ResourceTypeId, e.Name, e.IsActive);
}