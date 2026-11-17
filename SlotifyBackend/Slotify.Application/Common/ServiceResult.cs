namespace Slotify.Application.Common;

public enum ResultStatus { Ok, NotFound, Invalid, Conflict, Forbidden }

public class ServiceResult<T>
{
    public ResultStatus Status { get; private init; }
    public T? Value { get; private init; }
    public IReadOnlyList<string> Errors { get; private init; } = Array.Empty<string>();

    public static ServiceResult<T> Ok(T value) =>
        new() { Status = ResultStatus.Ok, Value = value };

    public static ServiceResult<T> NotFound() =>
        new() { Status = ResultStatus.NotFound };

    public static ServiceResult<T> Invalid(string error) =>
        new() { Status = ResultStatus.Invalid, Errors = new[] { error } };

    public static ServiceResult<T> Invalid(IEnumerable<string> errors) =>
        new() { Status = ResultStatus.Invalid, Errors = errors.ToList() };

    public static ServiceResult<T> Conflict(string error) =>
        new() { Status = ResultStatus.Conflict, Errors = new[] { error } };

    public static ServiceResult<T> Forbidden(string error) =>
        new() { Status = ResultStatus.Forbidden, Errors = new[] { error } };
}