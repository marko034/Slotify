using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Slotify.Application.Interfaces;
using Slotify.Infrastructure.Data;
using Slotify.Infrastructure.Persistence;

namespace Slotify.Infrastructure.Email;

public class EmailDispatcher(
    IServiceScopeFactory scopes,
    TimeProvider clock,
    ILogger<EmailDispatcher> logger) : BackgroundService
{
    private const int MaxAttempts = 6;

    // Razmak do sledećeg pokušaja posle 1., 2., ... neuspelog slanja
    private static readonly TimeSpan[] Backoff =
    {
        TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(5), TimeSpan.FromMinutes(15),
        TimeSpan.FromHours(1), TimeSpan.FromHours(6)
    };

    private DateTime _lastCleanupUtc = DateTime.MinValue;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await ProcessAsync(stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogError(ex, "Greška pri obradi reda za slanje mejlova.");
                }
            }
        }
        catch (OperationCanceledException)
        {
            // gašenje aplikacije
        }
    }

    private async Task ProcessAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sender = scope.ServiceProvider.GetRequiredService<IEmailSender>();
        var now = clock.GetUtcNow().UtcDateTime;

        var batch = await db.EmailMessages
            .Where(m => m.SentUtc == null && m.Attempts < MaxAttempts && m.NextAttemptUtc <= now)
            .OrderBy(m => m.CreatedUtc)
            .Take(20)
            .ToListAsync(ct);

        foreach (var m in batch)
        {
            try
            {
                await sender.SendAsync(m.ToEmail, m.Subject, m.HtmlBody, m.TextBody, ct);
                m.SentUtc = now;
                m.LastError = null;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                m.Attempts++;
                m.LastError = ex.Message.Length > 500 ? ex.Message[..500] : ex.Message;
                m.NextAttemptUtc = now + Backoff[Math.Min(m.Attempts - 1, Backoff.Length - 1)];
                logger.LogWarning(ex, "Slanje mejla {Id} nije uspelo (pokušaj {Attempt}).", m.Id, m.Attempts);
            }

            await db.SaveChangesAsync(ct);
        }

        // Jednom na par sati obriši stare poruke (poslate ili odustale)
        if (now - _lastCleanupUtc > TimeSpan.FromHours(6))
        {
            var cutoff = now.AddDays(-30);
            await db.EmailMessages
                .Where(m => m.CreatedUtc < cutoff && (m.SentUtc != null || m.Attempts >= MaxAttempts))
                .ExecuteDeleteAsync(ct);
            _lastCleanupUtc = now;
        }
    }
}