using Microsoft.AspNetCore.Mvc;
using Slotify.Application.Common;

namespace Slotify.Api.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected IActionResult ToAction<T>(ServiceResult<T> r) => r.Status switch
    {
        ResultStatus.Ok => Ok(r.Value),
        ResultStatus.NotFound => NotFound(),
        ResultStatus.Conflict => Conflict(new { errors = r.Errors }),
        ResultStatus.Forbidden => StatusCode(StatusCodes.Status403Forbidden, new { errors = r.Errors }),
        _ => BadRequest(new { errors = r.Errors })
    };

    protected IActionResult ToNoContent<T>(ServiceResult<T> r) =>
        r.Status == ResultStatus.Ok ? NoContent() : ToAction(r);
}