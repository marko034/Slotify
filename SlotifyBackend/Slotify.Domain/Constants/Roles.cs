
namespace Slotify.Domain.Constants;

public static class Roles
{
    public const string Owner = "Owner";
    public const string Staff = "Staff";
    public const string Player = "Player";
    public const string OwnerOrStaff = Owner + "," + Staff;

    public static readonly string[] All = { Owner, Staff, Player };
}
