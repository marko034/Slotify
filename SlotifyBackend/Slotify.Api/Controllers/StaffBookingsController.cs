using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Slotify.Application.Bookings;
using Slotify.Domain.Constants;

namespace Slotify.Api.Controllers;

[Route("api/staff")]
[Authorize(Roles = Roles.OwnerOrStaff)]
public class StaffBookingsController(IStaffBookingService staff) : ApiControllerBase
{
    [HttpGet("bookings")]
    public async Task<IActionResult> ListForDay(
        [FromQuery] DateOnly date, [FromQuery] bool includeCancelled, CancellationToken ct) =>
        ToAction(await staff.ListForDayAsync(date, includeCancelled, ct));

    [HttpPost("blocks")]
    public async Task<IActionResult> CreateBlock(CreateBlockRequest request, CancellationToken ct) =>
        ToAction(await staff.CreateBlockAsync(request, ct));

    [HttpPost("bookings/{id:guid}/no-show")]
    public async Task<IActionResult> MarkNoShow(Guid id, CancellationToken ct) =>
        ToNoContent(await staff.MarkNoShowAsync(id, ct));
}