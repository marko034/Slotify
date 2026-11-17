using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Slotify.Domain.Entities;

namespace Slotify.Infrastructure.Data.Configurations;

public class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> b)
    {
        b.HasKey(x => x.Id);

        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Kind).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.GuestName).HasMaxLength(150);
        b.Property(x => x.GuestPhone).HasMaxLength(40);
        b.Property(x => x.Notes).HasMaxLength(500);

        b.HasOne<Resource>().WithMany().HasForeignKey(x => x.ResourceId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(x => new { x.ResourceId, x.StartUtc });
        b.HasIndex(x => x.UserId);

        b.ToTable(t => t.HasCheckConstraint("ck_booking_range", "end_utc > start_utc"));
    }
}