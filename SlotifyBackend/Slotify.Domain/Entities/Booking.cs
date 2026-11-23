using Slotify.Domain.Enums;

namespace Slotify.Domain.Entities;

public class Booking
{
    public Guid Id { get; set; }
    public Guid ResourceId { get; set; }
    public DateTime StartUtc { get; set; }
    public DateTime EndUtc { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Confirmed;
    public BookingKind Kind { get; set; } = BookingKind.Reservation;
    public string? UserId { get; set; }
    public string? GuestName { get; set; }
    public string? GuestPhone { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedUtc { get; set; }
    public DateTime? ReminderSentUtc { get; set; }
}
