
using Microsoft.Extensions.DependencyInjection;
using Slotify.Application.Bookings;
using Slotify.Application.Email;
using Slotify.Application.OpeningHoursSettings;
using Slotify.Application.Resources;
using Slotify.Application.ResourceTypes;
using Slotify.Application.Venues;

namespace Slotify.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IVenueService, VenueService>();
        services.AddScoped<IResourceTypeService, ResourceTypeService>();
        services.AddScoped<IResourceService, ResourceService>();
        services.AddScoped<IOpeningHoursService, OpeningHoursService>();
        services.AddScoped<IAvailabilityService, AvailabilityService>();
        services.AddScoped<IBookingService, BookingService>();
        services.AddScoped<IStaffBookingService, StaffBookingService>();
        services.AddScoped<IEmailOutbox, EmailOutbox>();
        services.AddScoped<BookingNotifier>();
        services.AddScoped<IReminderService, ReminderService>();
        return services;
    }
}
