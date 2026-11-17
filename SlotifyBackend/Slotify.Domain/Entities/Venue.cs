
namespace Slotify.Domain.Entities;

public class Venue
{
    public static readonly Guid DefaultId = new("00000000-0000-0000-0000-000000000001");

    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string? Address { get; set; }
    public string TimeZoneId { get; set; } = "Europe/Belgrade";
}
