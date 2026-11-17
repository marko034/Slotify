using System.ComponentModel.DataAnnotations;
using Slotify.Domain.Enums;

namespace Slotify.Application.Bookings;

public record AvailabilityStartDto(DateTimeOffset Start, int MaxDurationMinutes);

public record ResourceAvailabilityDto(Guid ResourceId, string ResourceName, List<AvailabilityStartDto> Starts);

public record AvailabilityDto(
    DateOnly Date,
    string TimeZoneId,
    int SlotMinutes,
    int MinDurationMinutes,
    int MaxDurationMinutes,
    List<ResourceAvailabilityDto> Resources);

public record CreateBookingRequest(
    [Required] Guid ResourceId,
    [Required] DateTimeOffset Start,
    [Range(5, 1440)] int DurationMinutes,
    [StringLength(500)] string? Notes,
    [StringLength(150)] string? GuestName,
    [StringLength(40)] string? GuestPhone);

public record BookingDto(
    Guid Id,
    Guid ResourceId,
    string ResourceName,
    DateTimeOffset Start,
    DateTimeOffset End,
    BookingStatus Status,
    BookingKind Kind,
    string? GuestName,
    string? GuestPhone,
    string? Notes);