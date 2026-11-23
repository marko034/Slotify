using System.Security.Claims;
using Slotify.Application.Interfaces;
using Slotify.Domain.Constants;
using Slotify.Application.Interfaces;

namespace Slotify.Api.Services;

public class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public string? UserId => Principal?.FindFirst("sub")?.Value;

    public bool IsStaff =>
        Principal?.IsInRole(Roles.Owner) == true || Principal?.IsInRole(Roles.Staff) == true;
}