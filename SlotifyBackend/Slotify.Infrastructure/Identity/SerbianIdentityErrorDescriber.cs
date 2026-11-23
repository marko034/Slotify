using Microsoft.AspNetCore.Identity;

namespace Slotify.Infrastructure.Identity;

public class SerbianIdentityErrorDescriber : IdentityErrorDescriber
{
    public override IdentityError DefaultError() =>
        new() { Code = nameof(DefaultError), Description = "Došlo je do greške." };

    public override IdentityError DuplicateEmail(string email) =>
        new() { Code = nameof(DuplicateEmail), Description = "Nalog sa ovom email adresom već postoji." };

    public override IdentityError DuplicateUserName(string userName) =>
        new() { Code = nameof(DuplicateUserName), Description = "Nalog sa ovom email adresom već postoji." };

    public override IdentityError InvalidEmail(string? email) =>
        new() { Code = nameof(InvalidEmail), Description = "Email adresa nije ispravna." };

    public override IdentityError InvalidUserName(string? userName) =>
        new() { Code = nameof(InvalidUserName), Description = "Email adresa nije ispravna." };

    public override IdentityError InvalidToken() =>
        new() { Code = nameof(InvalidToken), Description = "Link nije ispravan ili je istekao." };

    public override IdentityError PasswordMismatch() =>
        new() { Code = nameof(PasswordMismatch), Description = "Trenutna lozinka nije tačna." };

    public override IdentityError PasswordTooShort(int length) =>
        new() { Code = nameof(PasswordTooShort), Description = $"Lozinka mora imati najmanje {length} znakova." };

    public override IdentityError PasswordRequiresDigit() =>
        new() { Code = nameof(PasswordRequiresDigit), Description = "Lozinka mora sadržati bar jednu cifru." };

    public override IdentityError PasswordRequiresLower() =>
        new() { Code = nameof(PasswordRequiresLower), Description = "Lozinka mora sadržati bar jedno malo slovo." };

    public override IdentityError PasswordRequiresUpper() =>
        new() { Code = nameof(PasswordRequiresUpper), Description = "Lozinka mora sadržati bar jedno veliko slovo." };

    public override IdentityError PasswordRequiresNonAlphanumeric() =>
        new() { Code = nameof(PasswordRequiresNonAlphanumeric), Description = "Lozinka mora sadržati bar jedan poseban znak." };
}