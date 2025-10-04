# BuildTrack Setup Script for Windows
Write-Host "🚀 BuildTrack Setup Script" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host "❌ .NET 9 SDK is required but not installed. Aborting." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is required but not installed. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green

# Start infrastructure services
Write-Host ""
Write-Host "Starting PostgreSQL and MinIO..." -ForegroundColor Yellow
docker-compose up -d postgres minio

Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Run migrations
Write-Host ""
Write-Host "Running database migrations..." -ForegroundColor Yellow
Set-Location src\api
dotnet ef database update --project BuildTrack.Infrastructure --startup-project BuildTrack.Api
Set-Location ..\..

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start the API:    cd src\api && dotnet run --project BuildTrack.Api"
Write-Host "  2. Start the Worker: cd src\api && dotnet run --project BuildTrack.Worker"
Write-Host "  3. Serve frontend:   cd src\web && python -m http.server 3000"
Write-Host ""
Write-Host "📝 Default credentials:" -ForegroundColor Cyan
Write-Host "  Admin: admin@buildtrack.local / Admin123!"
Write-Host "  PM:    pm@buildtrack.local / PM123!"
Write-Host "  User:  contributor@buildtrack.local / Contributor123!"
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "  Frontend:  http://localhost:3000"
Write-Host "  API:       http://localhost:5000"
Write-Host "  Swagger:   http://localhost:5000/swagger"
Write-Host "  MinIO:     http://localhost:9001 (minioadmin/minioadmin)"
