using Microsoft.AspNetCore.Diagnostics;
using Slotify.Application.Common;

namespace Slotify.Api.Services;

public class AppExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context, Exception exception, CancellationToken ct)
    {
        if (exception is not BookingConflictException)
            return false;

        context.Response.StatusCode = StatusCodes.Status409Conflict;
        await context.Response.WriteAsJsonAsync(new { errors = new[] { exception.Message } }, ct);
        return true;
    }
}