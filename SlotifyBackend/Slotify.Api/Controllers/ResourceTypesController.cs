using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Slotify.Application.ResourceTypes;
using Slotify.Domain.Constants;

namespace Slotify.Api.Controllers;

[Route("api/resource-types")]
[Authorize]
public class ResourceTypesController(IResourceTypeService types) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) =>
        ToAction(await types.ListAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        ToAction(await types.GetAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = Roles.Owner)]
    public async Task<IActionResult> Create(ResourceTypeRequest request, CancellationToken ct) =>
        ToAction(await types.CreateAsync(request, ct));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = Roles.Owner)]
    public async Task<IActionResult> Update(Guid id, ResourceTypeRequest request, CancellationToken ct) =>
        ToAction(await types.UpdateAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.Owner)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) =>
        ToNoContent(await types.DeleteAsync(id, ct));
}