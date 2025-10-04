using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;

namespace BuildTrack.Infrastructure.Services;

public class S3Service : IS3Service
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;

    public S3Service(IConfiguration configuration)
    {
        var serviceUrl = configuration["S3:ServiceUrl"];
        var accessKey = configuration["S3:AccessKey"];
        var secretKey = configuration["S3:SecretKey"];
        _bucketName = configuration["S3:BucketName"] ?? "buildtrack-documents";

        var config = new AmazonS3Config
        {
            ServiceURL = serviceUrl,
            ForcePathStyle = true
        };

        _s3Client = new AmazonS3Client(accessKey, secretKey, config);
    }

    public Task<(string Url, Dictionary<string, string> Headers, string Key)> GeneratePresignedUploadUrlAsync(
        string fileName, string contentType, long fileSizeBytes)
    {
        var key = $"uploads/{DateTime.UtcNow:yyyy/MM/dd}/{Guid.NewGuid()}/{fileName}";

        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = key,
            Verb = HttpVerb.PUT,
            Expires = DateTime.UtcNow.AddMinutes(5),
            ContentType = contentType
        };

        var url = _s3Client.GetPreSignedURL(request);

        var headers = new Dictionary<string, string>
        {
            { "Content-Type", contentType }
        };

        return Task.FromResult((url, headers, key));
    }

    public Task<string> GeneratePresignedDownloadUrlAsync(string key, int expirationMinutes = 5)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = key,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.AddMinutes(expirationMinutes)
        };

        return Task.FromResult(_s3Client.GetPreSignedURL(request));
    }

    public async Task<bool> DeleteFileAsync(string key)
    {
        try
        {
            var request = new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = key
            };

            await _s3Client.DeleteObjectAsync(request);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
