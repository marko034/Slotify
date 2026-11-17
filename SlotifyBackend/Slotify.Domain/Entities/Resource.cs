
namespace Slotify.Domain.Entities;

public class Resource
{
    public Guid Id { get; set; }
    public Guid ResourceTypeId { get; set; }
    public string Name { get; set; } = "";
    public bool IsActive { get; set; } = true;
}
