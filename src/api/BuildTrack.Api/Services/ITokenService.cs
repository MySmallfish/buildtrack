using BuildTrack.Domain.Entities;

namespace BuildTrack.Api.Services;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    Guid? ValidateRefreshToken(string token);
}
