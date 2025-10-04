using System.Net;
using System.Net.Mail;

namespace BuildTrack.Api.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendVerificationCodeAsync(string email, string code, string fullName)
    {
        var subject = "BuildTrack - Verify Your Email";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif;'>
                <h2>Welcome to BuildTrack, {fullName}!</h2>
                <p>Thank you for signing up. Please use the verification code below to complete your registration:</p>
                <div style='background-color: #f4f4f4; padding: 15px; margin: 20px 0; text-align: center;'>
                    <h1 style='color: #333; letter-spacing: 5px; margin: 0;'>{code}</h1>
                </div>
                <p>This code will expire in 15 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <br/>
                <p>Best regards,<br/>The BuildTrack Team</p>
            </body>
            </html>
        ";

        await SendEmailAsync(email, subject, body);
    }

    public async Task SendPasswordResetCodeAsync(string email, string code, string fullName)
    {
        var subject = "BuildTrack - Password Reset Code";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif;'>
                <h2>Hello {fullName},</h2>
                <p>You requested to reset your password. Use the code below:</p>
                <div style='background-color: #f4f4f4; padding: 15px; margin: 20px 0; text-align: center;'>
                    <h1 style='color: #333; letter-spacing: 5px; margin: 0;'>{code}</h1>
                </div>
                <p>This code will expire in 15 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <br/>
                <p>Best regards,<br/>The BuildTrack Team</p>
            </body>
            </html>
        ";

        await SendEmailAsync(email, subject, body);
    }

    private async Task SendEmailAsync(string to, string subject, string body)
    {
        var smtpHost = _configuration["Email:SmtpHost"];
        var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
        var smtpUser = _configuration["Email:SmtpUser"];
        var smtpPassword = _configuration["Email:SmtpPassword"];
        var fromEmail = _configuration["Email:FromEmail"] ?? smtpUser;
        var fromName = _configuration["Email:FromName"] ?? "BuildTrack";

        // If SMTP is not configured, log the email instead
        if (string.IsNullOrEmpty(smtpHost) || string.IsNullOrEmpty(smtpUser))
        {
            _logger.LogWarning("SMTP not configured. Email would be sent to {Email}:", to);
            _logger.LogInformation("Subject: {Subject}", subject);
            _logger.LogInformation("Body: {Body}", body);
            return;
        }

        try
        {
            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(smtpUser, smtpPassword)
            };

            var message = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            message.To.Add(to);

            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent successfully to {Email}", to);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", to);
            throw;
        }
    }
}
