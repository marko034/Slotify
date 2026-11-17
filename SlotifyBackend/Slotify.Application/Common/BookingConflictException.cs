namespace Slotify.Application.Common;

public class BookingConflictException(Exception inner)
    : Exception("Termin je u međuvremenu zauzet.", inner);