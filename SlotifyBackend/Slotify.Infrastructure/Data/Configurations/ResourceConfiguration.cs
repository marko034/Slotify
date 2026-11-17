using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Slotify.Domain.Entities;

namespace Slotify.Infrastructure.Data.Configurations;

public class ResourceConfiguration : IEntityTypeConfiguration<Resource>
{
    public void Configure(EntityTypeBuilder<Resource> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).IsRequired().HasMaxLength(100);

        b.HasOne<ResourceType>().WithMany().HasForeignKey(x => x.ResourceTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(x => x.Name).IsUnique(); // dva stola se ne zovu isto
    }
}