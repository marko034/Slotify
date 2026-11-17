using System.ComponentModel.DataAnnotations;
using Slotify.Application.Common;

namespace Slotify.Application.Staff;

public record StaffMemberDto(string UserId, string Email, string FullName);

public record AddStaffRequest([Required, EmailAddress] string Email);

public interface IStaffService
{
    Task<ServiceResult<List<StaffMemberDto>>> ListAsync(CancellationToken ct);
    Task<ServiceResult<StaffMemberDto>> AddAsync(AddStaffRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> RemoveAsync(string userId, CancellationToken ct);
}