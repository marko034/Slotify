using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Slotify.Domain.Entities;

namespace Slotify.Infrastructure.Persistence.Configurations;

public class EmailMessageConfiguration : IEntityTypeConfiguration<EmailMessage>
{
    public void Configure(EntityTypeBuilder<EmailMessage> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.ToEmail).IsRequired().HasMaxLength(320);
        b.Property(x => x.Subject).IsRequired().HasMaxLength(300);
        b.Property(x => x.LastError).HasMaxLength(500);

        b.HasIndex(x => new { x.SentUtc, x.NextAttemptUtc });
    }
}