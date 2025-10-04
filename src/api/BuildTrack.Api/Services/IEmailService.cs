namespace BuildTrack.Api.Services;

public interface IEmailService
{
    Task SendVerificationCodeAsync(string email, string code, string fullName);
    Task SendPasswordResetCodeAsync(string email, string code, string fullName);
}
