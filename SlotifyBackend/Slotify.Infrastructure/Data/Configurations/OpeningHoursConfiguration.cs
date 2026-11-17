using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Slotify.Domain.Entities;

namespace Slotify.Infrastructure.Data.Configurations;

public class OpeningHoursConfiguration : IEntityTypeConfiguration<OpeningHours>
{
    public void Configure(EntityTypeBuilder<OpeningHours> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.DayOfWeek).IsUnique();
        b.ToTable(t => t.HasCheckConstraint("ck_opening_hours_range", "close_time > open_time"));
    }
}