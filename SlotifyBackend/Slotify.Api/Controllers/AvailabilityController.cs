using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Slotify.Application.Bookings;

namespace Slotify.Api.Controllers;

[Route("api/availability")]
[Authorize]
public class AvailabilityController(IAvailabilityService availability) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DateOnly date, [FromQuery] Guid resourceTypeId, CancellationToken ct) =>
        ToAction(await availability.GetAsync(date, resourceTypeId, ct));
}