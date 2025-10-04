namespace BuildTrack.Infrastructure.Services;

public interface IS3Service
{
    Task<(string Url, Dictionary<string, string> Headers, string Key)> GeneratePresignedUploadUrlAsync(
        string fileName, string contentType, long fileSizeBytes);
    
    Task<string> GeneratePresignedDownloadUrlAsync(string key, int expirationMinutes = 5);
    
    Task<bool> DeleteFileAsync(string key);
}
