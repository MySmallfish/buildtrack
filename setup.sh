#!/bin/bash
set -e

echo "🚀 BuildTrack Setup Script"
echo "=========================="

# Check prerequisites
echo "Checking prerequisites..."
command -v dotnet >/dev/null 2>&1 || { echo "❌ .NET 9 SDK is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Aborting." >&2; exit 1; }

echo "✅ Prerequisites check passed"

# Start infrastructure services
echo ""
echo "Starting PostgreSQL and MinIO..."
docker-compose up -d postgres minio

echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Run migrations
echo ""
echo "Running database migrations..."
cd src/api
dotnet ef database update --project BuildTrack.Infrastructure --startup-project BuildTrack.Api

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  1. Start the API:    cd src/api && dotnet run --project BuildTrack.Api"
echo "  2. Start the Worker: cd src/api && dotnet run --project BuildTrack.Worker"
echo "  3. Serve frontend:   cd src/web && python -m http.server 3000"
echo ""
echo "📝 Default credentials:"
echo "  Admin: admin@buildtrack.local / Admin123!"
echo "  PM:    pm@buildtrack.local / PM123!"
echo "  User:  contributor@buildtrack.local / Contributor123!"
echo ""
echo "🌐 URLs:"
echo "  Frontend:  http://localhost:3000"
echo "  API:       http://localhost:5000"
echo "  Swagger:   http://localhost:5000/swagger"
echo "  MinIO:     http://localhost:9001 (minioadmin/minioadmin)"
