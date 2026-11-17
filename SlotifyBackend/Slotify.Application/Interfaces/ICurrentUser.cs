namespace Slotify.Application.Interfaces;

public interface ICurrentUser
{
    string? UserId { get; }
    bool IsStaff { get; }   // Owner ili Staff
}