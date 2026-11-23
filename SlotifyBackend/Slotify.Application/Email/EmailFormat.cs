using System.Globalization;

namespace Slotify.Application.Email;

public static class EmailFormat
{
    private static readonly string[] Days =
        { "nedelja", "ponedeljak", "utorak", "sreda", "četvrtak", "petak", "subota" };

    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;

    public static string Day(DateTimeOffset value) =>
        $"{Days[(int)value.DayOfWeek]}, {value.ToString("dd.MM.yyyy.", Invariant)}";

    public static string When(DateTimeOffset start, DateTimeOffset end) =>
        $"{Day(start)} {start.ToString("HH:mm", Invariant)} – {end.ToString("HH:mm", Invariant)}";

    public static string Time(DateTimeOffset value) => value.ToString("HH:mm", Invariant);
}