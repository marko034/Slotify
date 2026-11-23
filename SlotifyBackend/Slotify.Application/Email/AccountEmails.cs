namespace Slotify.Application.Email;

public static class AccountEmails
{
    public static EmailContent ConfirmEmail(string name, string url) => EmailTemplates.Build(
        "Potvrdi email adresu - Slotify",
        "Potvrda email adrese",
        new[] { $"Zdravo {name},", "Hvala na registraciji. Potvrdi email adresu klikom na dugme ispod, link važi 24 sata." },
        "Potvrdi email", url,
        "Ako zahtev nije poslat od tebe, slobodno ignoriši ovu poruku.");

    public static EmailContent ResetPassword(string name, string url) => EmailTemplates.Build(
        "Nova lozinka - Slotify",
        "Zahtev za novu lozinku",
        new[] { $"Zdravo {name},", "Primili smo zahtev za promenu lozinke. Klikni na dugme ispod da je postaviš, link važi 24 sata." },
        "Postavi novu lozinku", url,
        "Ako zahtev nije poslat od tebe, ignoriši ovu poruku. Lozinka ostaje ista.");

    public static EmailContent AccountDeleted(string name) => EmailTemplates.Build(
        "Nalog je obrisan - Slotify",
        "Nalog je obrisan",
        new[] { $"Zdravo {name},", "Tvoj nalog je obrisan, a predstojeće rezervacije su otkazane." });
}