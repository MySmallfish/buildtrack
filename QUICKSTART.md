# BuildTrack - Quick Start Guide

Get BuildTrack running in 5 minutes! 🚀

## Prerequisites

- ✅ .NET 9 SDK ([Download](https://dotnet.microsoft.com/download/dotnet/9.0))
- ✅ Docker Desktop ([Download](https://www.docker.com/products/docker-desktop))
- ✅ Git

## One-Command Setup

### Windows (PowerShell)
```powershell
.\setup.ps1
```

### Linux/Mac
```bash
chmod +x setup.sh && ./setup.sh
```

## Manual Setup (Step-by-Step)

### 1. Start Infrastructure Services
```bash
docker-compose up -d postgres minio
```

This starts:
- **PostgreSQL** on port 5432
- **MinIO** (S3-compatible storage) on ports 9000 & 9001

### 2. Apply Database Migrations
```bash
cd src/api
dotnet ef database update --project BuildTrack.Infrastructure --startup-project BuildTrack.Api
```

This creates the database schema and seeds initial data.

### 3. Start the API Server
```bash
# From src/api directory
dotnet run --project BuildTrack.Api
```

API will be available at: **http://localhost:5000**

### 4. Start the Background Worker
Open a new terminal:
```bash
cd src/api
dotnet run --project BuildTrack.Worker
```

This processes automation events every 30 seconds.

### 5. Serve the Frontend
Open another terminal:
```bash
cd src/web
python -m http.server 3000
# Or use: npx serve -p 3000
```

Frontend will be available at: **http://localhost:3000**

## 🎯 Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | See below |
| **API** | http://localhost:5000 | - |
| **Swagger UI** | http://localhost:5000/swagger | - |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin |

## 👤 Default Users

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@buildtrack.local | Admin123! |
| **Project Manager** | pm@buildtrack.local | PM123! |
| **Contributor** | contributor@buildtrack.local | Contributor123! |

## 🧪 Test the System

### 1. Login
- Go to http://localhost:3000
- Login with: `admin@buildtrack.local` / `Admin123!`

### 2. View Projects
- You'll see the Overview page
- Currently shows seeded data (if any projects exist)

### 3. Test API via Swagger
- Go to http://localhost:5000/swagger
- Click "Authorize" button
- Login to get a JWT token
- Try the `/api/v1/projects` endpoint

### 4. Create a Project (via API)
```bash
# First, login to get token
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@buildtrack.local","password":"Admin123!"}'

# Use the accessToken in the response
curl -X POST http://localhost:5000/api/v1/projects \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Building",
    "startDate": "2025-10-01",
    "projectTypeId": "GUID_FROM_SEED_DATA",
    "ownerUserId": "GUID_FROM_SEED_DATA"
  }'
```

## 🔧 Troubleshooting

### Port Already in Use
If ports 5000, 3000, 5432, or 9000 are in use:

**Change API Port:**
Edit `src/api/BuildTrack.Api/appsettings.json`:
```json
"Urls": "http://localhost:5001"
```

**Change Frontend Port:**
```bash
python -m http.server 3001
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Migration Errors
```bash
# Drop and recreate database
cd src/api
dotnet ef database drop --project BuildTrack.Infrastructure --startup-project BuildTrack.Api --force
dotnet ef database update --project BuildTrack.Infrastructure --startup-project BuildTrack.Api
```

### Build Errors
```bash
# Clean and rebuild
cd src/api
dotnet clean
dotnet restore
dotnet build
```

## 📚 Next Steps

1. **Explore the API** - Check out Swagger UI for all endpoints
2. **Read the PRD** - See `docs/PRD.md` for full feature list
3. **Check Implementation** - See `IMPLEMENTATION_SUMMARY.md` for what's built
4. **Run Tests** - `dotnet test` (when tests are added)
5. **Customize** - Modify seed data in `BuildTrack.Infrastructure/Data/SeedData.cs`

## 🎓 Key Concepts

### Workspaces
- Multi-tenant isolation
- Each user belongs to one workspace
- Data is automatically filtered by workspace

### Roles
- **Admin** - Full access, user management
- **Project Manager** - Create projects, approve documents
- **Contributor** - Upload documents, view assigned work

### Projects & Templates
- Projects are created from templates
- Templates define milestone structure
- Milestones have due date offsets from project start

### Documents
- Upload via presigned S3 URLs
- Approve/reject workflow
- Versioning supported
- Linked to milestone requirements

### Automation
- Background worker processes events
- Auto-completes milestones when all docs approved
- Runs every 30 seconds

## 🆘 Getting Help

- **Documentation:** Check `README.md` and `docs/` folder
- **API Reference:** http://localhost:5000/swagger
- **Logs:** Check console output from API and Worker
- **Database:** Connect to PostgreSQL on localhost:5432

## 🚀 Production Deployment

For production deployment:
1. Set up proper PostgreSQL instance
2. Configure AWS S3 or production MinIO
3. Set secure JWT keys in environment variables
4. Enable HTTPS
5. Set up CI/CD pipeline
6. Configure monitoring and logging
7. Set up backups

See `README.md` for detailed production setup guide.

---

**Happy Building! 🏗️**
