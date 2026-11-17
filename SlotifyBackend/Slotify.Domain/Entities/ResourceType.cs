
namespace Slotify.Domain.Entities;

public class ResourceType
{
    public Guid Id { get; set; }
    public string Name { get; set; } = ""; 
    public int SlotMinutes { get; set; } = 30;
    public int MinDurationMinutes { get; set; } = 60;
    public int MaxDurationMinutes { get; set; } = 180;
    public int MaxDaysInAdvance { get; set; } = 30;
    public int CancellationDeadlineHours { get; set; } = 2;
    public decimal PricePerHour { get; set; }
}
