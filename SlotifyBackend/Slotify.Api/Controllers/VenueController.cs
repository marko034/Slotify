using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Slotify.Application.Venues;
using Slotify.Domain.Constants;

namespace Slotify.Api.Controllers;

[Route("api/venue")]
[Authorize]
public class VenueController(IVenueService venue) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        ToAction(await venue.GetAsync(ct));

    [HttpPut]
    [Authorize(Roles = Roles.Owner)]
    public async Task<IActionResult> Update(UpdateVenueRequest request, CancellationToken ct) =>
        ToAction(await venue.UpdateAsync(request, ct));
}