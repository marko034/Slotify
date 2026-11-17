using Microsoft.EntityFrameworkCore;
using Slotify.Domain.Entities;

namespace Slotify.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<Venue> Venues { get; }
    DbSet<ResourceType> ResourceTypes { get; }
    DbSet<Resource> Resources { get; }
    DbSet<OpeningHours> OpeningHours { get; }
    DbSet<Booking> Bookings { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}