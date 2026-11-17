using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Slotify.Application.Bookings;

namespace Slotify.Api.Controllers;

[Route("api/bookings")]
[Authorize]
public class BookingsController(IBookingService bookings) : ApiControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateBookingRequest request, CancellationToken ct) =>
        ToAction(await bookings.CreateAsync(request, ct));

    [HttpGet("my")]
    public async Task<IActionResult> ListMine([FromQuery] bool includePast, CancellationToken ct) =>
        ToAction(await bookings.ListMineAsync(includePast, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct) =>
        ToNoContent(await bookings.CancelAsync(id, ct));
}