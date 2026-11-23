using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Slotify.Application.Bookings;

namespace Slotify.Infrastructure.Email;

public class ReminderWorker(
    IServiceScopeFactory scopes,
    IOptions<ReminderOptions> options,
    ILogger<ReminderWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var lead = TimeSpan.FromHours(options.Value.LeadHours);
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    using var scope = scopes.CreateScope();
                    var reminders = scope.ServiceProvider.GetRequiredService<IReminderService>();
                    var count = await reminders.QueueDueAsync(lead, stoppingToken);

                    if (count > 0)
                        logger.LogInformation("Stavljeno u red {Count} podsetnika.", count);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogError(ex, "Greška pri pravljenju podsetnika.");
                }
            }
        }
        catch (OperationCanceledException)
        {
            // gašenje aplikacije
        }
    }
}