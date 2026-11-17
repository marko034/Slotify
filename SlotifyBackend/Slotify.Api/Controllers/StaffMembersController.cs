using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Slotify.Application.Staff;
using Slotify.Domain.Constants;

namespace Slotify.Api.Controllers;

[Route("api/staff-members")]
[Authorize(Roles = Roles.Owner)]
public class StaffMembersController(IStaffService staff) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) =>
        ToAction(await staff.ListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Add(AddStaffRequest request, CancellationToken ct) =>
        ToAction(await staff.AddAsync(request, ct));

    [HttpDelete("{userId}")]
    public async Task<IActionResult> Remove(string userId, CancellationToken ct) =>
        ToNoContent(await staff.RemoveAsync(userId, ct));
}