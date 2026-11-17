using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Slotify.Application.Resources;
using Slotify.Domain.Constants;

namespace Slotify.Api.Controllers;

[Route("api/resources")]
[Authorize]
public class ResourcesController(IResourceService resources) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) =>
        ToAction(await resources.ListAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        ToAction(await resources.GetAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = Roles.Owner)]
    public async Task<IActionResult> Create(ResourceRequest request, CancellationToken ct) =>
        ToAction(await resources.CreateAsync(request, ct));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = Roles.Owner)]
    public async Task<IActionResult> Update(Guid id, ResourceRequest request, CancellationToken ct) =>
        ToAction(await resources.UpdateAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.Owner)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) =>
        ToNoContent(await resources.DeleteAsync(id, ct));
}