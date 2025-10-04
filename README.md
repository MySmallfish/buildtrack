# BuildTrack

A comprehensive building projects tracking platform for managing construction milestones, documents, and team collaboration.

## Overview

BuildTrack provides:
- **Projects Grid**: Real-time portfolio view with milestone status tracking
- **Document Management**: Upload, versioning, and approval workflows with S3 storage
- **Milestone Tracking**: Template-based project creation with automated due date calculations
- **Automations**: Event-driven rules for milestone completion and notifications
- **Multi-tenant**: Workspace isolation with role-based access control (Admin, PM, Contributor)
- **Audit Trail**: Complete logging of sensitive actions

## Tech Stack

### Backend (.NET 9)
- **API**: ASP.NET Core Minimal APIs
- **Database**: PostgreSQL with EF Core 9
- **Authentication**: JWT with ASP.NET Identity
- **Storage**: S3-compatible (AWS S3 / MinIO)
- **Background Jobs**: Quartz.NET for scheduled tasks
- **Logging**: Serilog
- **Documentation**: Swagger/OpenAPI

### Frontend (Vanilla JS)
- **State Management**: XState v5
- **Routing**: History API with XState router machine
- **UI**: Native HTML/CSS/JS with ES modules
- **PDF Preview**: pdf.js
- **Virtualization**: clusterize.js for grid performance

## Getting Started

### Prerequisites
- .NET 9 SDK
- PostgreSQL 16+
- MinIO (for local S3-compatible storage) or AWS S3
- Node.js 20+ (for frontend tooling)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd buildtrack
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local settings
   ```

3. **Start infrastructure services**
   ```bash
   docker-compose up -d postgres minio
   ```

4. **Run database migrations**
   ```bash
   cd src/api
   dotnet ef database update --project BuildTrack.Infrastructure --startup-project BuildTrack.Api
   ```

5. **Start the API**
   ```bash
   cd src/api
   dotnet run --project BuildTrack.Api
   ```
   API will be available at `http://localhost:5000`
   Swagger UI at `http://localhost:5000/swagger`

6. **Start the Worker (background jobs)**
   ```bash
   cd src/api
   dotnet run --project BuildTrack.Worker
   ```

7. **Serve the frontend**
   ```bash
   cd src/web
   # Using Python
   python -m http.server 3000
   # Or using Node.js
   npx serve -p 3000
   ```
   Frontend will be available at `http://localhost:3000`

### Default Users (Seeded)

| Email | Password | Role |
|-------|----------|------|
| admin@buildtrack.local | Admin123! | Admin |
| pm@buildtrack.local | PM123! | Project Manager |
| contributor@buildtrack.local | Contributor123! | Contributor |

## Project Structure

```
buildtrack/
├── docs/                      # Documentation
│   ├── PRD.md                # Product Requirements
│   ├── tasks.md              # Implementation tasks
│   ├── state-machines.md     # XState machine specs
│   ├── backlog.yaml          # Prioritized backlog
│   ├── progress.md           # Engineering log
│   ├── changelog.md          # User-facing changes
│   └── test-plan.md          # Test scenarios
├── src/
│   ├── api/
│   │   ├── BuildTrack.Api/           # Minimal APIs, endpoints
│   │   ├── BuildTrack.Domain/        # Entities, enums
│   │   ├── BuildTrack.Infrastructure/ # EF Core, S3, email
│   │   ├── BuildTrack.Worker/        # Background jobs
│   │   └── BuildTrack.Tests/         # xUnit tests
│   └── web/
│       ├── index.html
│       ├── css/
│       ├── js/
│       │   ├── main.js
│       │   ├── services/
│       │   ├── machines/      # XState state machines
│       │   └── ui/            # Render helpers
│       └── tests/e2e/         # Playwright tests
├── .github/workflows/         # CI/CD
├── docker-compose.yml
└── .env.example
```

## API Endpoints

Base URL: `/api/v1`

### Authentication
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout
- `GET /me` - Get current user

### Projects
- `GET /projects` - List projects (with filters)
- `POST /projects` - Create project from template
- `GET /projects/{id}` - Get project details
- `PATCH /projects/{id}` - Update project

### Milestones
- `POST /projects/{id}/milestones` - Add milestone
- `PATCH /milestones/{id}` - Update milestone
- `POST /timeline` - Add timeline event/comment

### Documents
- `POST /requirements/{reqId}/upload-url` - Get presigned upload URL
- `POST /documents/confirm` - Confirm upload
- `POST /documents/{id}/approve` - Approve document
- `POST /documents/{id}/reject` - Reject document
- `GET /documents?status=Pending` - List documents

### Entities
- `GET/POST/PATCH /entities/skills`
- `GET/POST/PATCH /entities/project-types`
- `GET/POST/PATCH /entities/milestone-types`
- `GET/POST/PATCH /entities/document-types`
- `GET/POST /templates`

### Automations
- `GET/POST/PATCH /automations`
- `POST /automations/{id}/test`

### Admin
- `GET/POST /users`
- `PATCH /users/{id}`
- `GET /notifications`
- `GET /audit-logs`

## Testing

### Unit Tests
```bash
cd src/api
dotnet test
```

### Integration Tests (with Testcontainers)
```bash
cd src/api
dotnet test --filter Category=Integration
```

### E2E Tests (Playwright)
```bash
cd src/web/tests/e2e
npm install
npx playwright test
```

## Performance Targets

- Overview grid p95 load: **< 2s** for 200 projects × 15 milestones
- Document upload: **< 5s** for 25 MB files
- API response time: **< 200ms** p95 for read operations

## Security

- Multi-tenant workspace isolation via EF Core query filters
- JWT authentication with refresh token rotation
- Role-based authorization (Admin, PM, Contributor)
- S3 presigned URLs with 5-minute TTL
- Audit logging for sensitive operations
- CORS configured for known origins

## Deployment

### Docker Compose (Development)
```bash
docker-compose up
```

### Production
See `.github/workflows/deploy.yml` for CI/CD pipeline.

## Contributing

1. Create a feature branch: `feature/US-<story>-<short-title>`
2. Follow conventional commits: `feat(api): A1 login endpoint (#A1-T1)`
3. Update `docs/progress.md` after each story
4. Mark tasks done in `docs/backlog.yaml`

## License

Proprietary - All rights reserved

## Support

For issues and questions, contact the development team.
