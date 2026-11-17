using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Slotify.Application.OpeningHoursSettings;
using Slotify.Domain.Constants;

namespace Slotify.Api.Controllers;

[Route("api/opening-hours")]
[Authorize]
public class OpeningHoursController(IOpeningHoursService hours) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        ToAction(await hours.GetAsync(ct));

    [HttpPut]
    [Authorize(Roles = Roles.Owner)]
    public async Task<IActionResult> Set(SetOpeningHoursRequest request, CancellationToken ct) =>
        ToAction(await hours.SetAsync(request, ct));
}