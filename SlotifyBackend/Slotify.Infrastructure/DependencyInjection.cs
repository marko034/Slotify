using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Slotify.Application.Interfaces;
using Slotify.Application.Auth;
using Slotify.Application.Staff;
using Slotify.Infrastructure.Data;
using Slotify.Infrastructure.Email;
using Slotify.Infrastructure.Identity;

namespace Slotify.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Fali ConnectionStrings:Default.");

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .Validate(o => o.Key.Length >= 32, "Jwt:Key mora imati najmanje 32 znaka.")
            .ValidateOnStart();

        services.AddOptions<ClientOptions>()
            .Bind(configuration.GetSection(ClientOptions.SectionName))
            .Validate(o => Uri.TryCreate(o.BaseUrl, UriKind.Absolute, out _),
                "Client:BaseUrl mora biti apsolutna adresa klijenta.")
            .ValidateOnStart();

        services.AddOptions<EmailOptions>().Bind(configuration.GetSection(EmailOptions.SectionName));

        services.AddOptions<ReminderOptions>()
            .Bind(configuration.GetSection(ReminderOptions.SectionName))
            .Validate(o => o.LeadHours > 0, "Reminders:LeadHours mora biti veći od nule.");

        services.AddIdentityCore<ApplicationUser>(o =>
        {
            o.User.RequireUniqueEmail = true;
            o.Password.RequiredLength = 8;
            o.Password.RequireDigit = true;
            o.Password.RequireLowercase = true;
            o.Password.RequireUppercase = false;
            o.Password.RequireNonAlphanumeric = false;
            o.Lockout.MaxFailedAccessAttempts = 5;
            o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        })
        .AddRoles<IdentityRole>()
        .AddEntityFrameworkStores<AppDbContext>()
        .AddDefaultTokenProviders() // tokeni za potvrdu emaila i reset lozinke
        .AddErrorDescriber<SerbianIdentityErrorDescriber>();

        services.AddSingleton<TokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserDirectory, UserDirectory>();
        services.AddScoped<IStaffService, StaffService>();

        services.AddScoped<IEmailSender, SmtpEmailSender>();
        services.AddSingleton<IClientLinks, ClientLinks>();

        if (configuration.GetValue<bool>("Email:Enabled"))
            services.AddHostedService<EmailDispatcher>();

        if (configuration.GetValue<bool>("Reminders:Enabled"))
            services.AddHostedService<ReminderWorker>();

        return services;
    }
}