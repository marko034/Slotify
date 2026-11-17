
using Microsoft.AspNetCore.Identity;

namespace Slotify.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
    public string? FullName { get; set; }
}
