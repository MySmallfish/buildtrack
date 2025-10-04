# BuildTrack Implementation Status

## Completed Features (P0)

### Backend API ✅

#### Authentication & Authorization
- ✅ JWT-based authentication (access + refresh tokens)
- ✅ Email signup with verification codes
- ✅ Login/logout endpoints
- ✅ Password requirements (ASP.NET Identity)
- ✅ Workspace-based multi-tenancy
- ✅ Role-based access control (Admin/PM/Contributor)

#### Entities Management
- ✅ Skills CRUD endpoints
- ✅ Document Types CRUD
- ✅ Milestone Types CRUD
- ✅ Project Types CRUD
- ✅ Templates CRUD with versioning

#### Projects & Milestones
- ✅ Create project from template
- ✅ Get projects with filters (status, owner)
- ✅ Get project details with milestones & timeline
- ✅ Update milestone (due date, status, assignments, flags)
- ✅ Timeline events & comments
- ✅ Automatic milestone creation from templates

#### Documents & Approvals
- ✅ Pre-signed S3 upload URLs
- ✅ Document upload confirmation
- ✅ File type & size validation
- ✅ Document approval/rejection
- ✅ Version tracking
- ✅ Integration events for automation

#### Users & Team
- ✅ User CRUD endpoints
- ✅ Get user assignments (contributor portal)
- ✅ Skill assignment to users
- ✅ User activation/deactivation

#### Notifications
- ✅ Get notifications (with unread filter)
- ✅ Mark notification as read
- ✅ Mark all notifications as read

#### Automations
- ✅ Automation rules CRUD
- ✅ Integration events table (outbox pattern)
- ✅ Trigger types support

### Frontend UI ✅

#### Authentication
- ✅ Login form with error handling
- ✅ Signup form (email, password, full name, workspace)
- ✅ Email verification with 6-digit code
- ✅ Resend verification code
- ✅ Form switching (login ↔ signup ↔ verify)
- ✅ Session persistence with refresh tokens

#### Main Layout
- ✅ Sidebar navigation
- ✅ User profile display
- ✅ Logout functionality
- ✅ Responsive layout

#### Projects Grid View
- ✅ Projects list with progress bars
- ✅ Status badges
- ✅ Filter by status
- ✅ Progress indicators (completed/total milestones)
- ✅ Next due date display
- ✅ Click to view project details

#### Project Details
- ✅ Tabbed interface (Overview, Milestones, Timeline, Documents)
- ✅ **Overview Tab**: Project info, progress circle, stakeholders, recent activity
- ✅ **Milestones Tab**: List of milestones with status and requirements
- ✅ **Timeline Tab**: Full timeline with add comment functionality
- ✅ **Documents Tab**: Placeholder for document management
- ✅ Back navigation
- ✅ Add comment modal

#### Team Management
- ✅ Team members grid view
- ✅ User cards with avatar, role, and status
- ✅ Add user button (placeholder)

#### Notifications/Messages
- ✅ Notifications list
- ✅ Unread indicator
- ✅ Mark all as read
- ✅ Relative timestamps
- ✅ Type-based icons

#### API Integration
- ✅ Complete API service layer
- ✅ Authentication with bearer tokens
- ✅ Token refresh on 401
- ✅ Error handling
- ✅ All CRUD operations

### Infrastructure ✅

- ✅ PostgreSQL with EF Core
- ✅ Workspace-based query filters
- ✅ S3-compatible storage service
- ✅ Email service (SMTP with console fallback)
- ✅ Serilog logging
- ✅ Swagger documentation
- ✅ CORS configuration
- ✅ Health check endpoint

## Completed P1 Features ✅

### Frontend
- ✅ **New Project Modal**: Complete form with all fields (name, code, type, owner, start date, location, stakeholders, tags)
- ✅ **Contributor Portal**: "My Assignments" view showing assigned milestones with requirements
- ✅ **Calendar View**: Monthly calendar with navigation (prev/next month, today button)
- ✅ **Toast Notifications**: Success/error/info/warning toast messages
- ✅ **Assignment Cards**: Visual cards showing milestone status, due dates, and requirements
- ✅ **Requirement Badges**: Color-coded badges for document states (NotProvided, PendingReview, Approved, Rejected)

## Pending Features (P0)

### Backend
- ⏳ Database migration for email verification fields
- ⏳ Automation worker service (process integration events)
- ⏳ Auto-complete milestone on all requirements approved
- ⏳ Email notifications (templates & sending)
- ⏳ Audit log middleware

### Frontend
- ⏳ Document upload UI with progress bar
- ⏳ Document approval/rejection UI
- ⏳ PDF preview (pdf.js)
- ⏳ Edit milestone modal
- ⏳ Context menu on grid cells

## P1 Features (Future)

### Backend
- Calendar view API
- Analytics aggregations
- Due-soon scheduler (Quartz.NET)
- Bulk operations
- CSV import/export

### Frontend
- Calendar view
- Analytics dashboard
- Advanced filters
- Bulk actions
- Keyboard navigation
- Grid virtualization (clusterize.js)

## P2 Features (Polish)

- Rule builder UI
- Automation test runs
- Digest emails
- Accessibility improvements
- Performance optimizations
- Archive flows

## How to Run

### Prerequisites
- .NET 9 SDK
- PostgreSQL
- MinIO or AWS S3 (optional for documents)

### Backend Setup

1. **Update connection string** in `appsettings.json`:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Host=localhost;Port=5432;Database=buildtrack;Username=postgres;Password=postgres"
   }
   ```

2. **Run migrations**:
   ```bash
   cd src/api
   dotnet ef migrations add AddEmailVerification --project BuildTrack.Infrastructure --startup-project BuildTrack.Api
   dotnet ef database update --project BuildTrack.Infrastructure --startup-project BuildTrack.Api
   ```

3. **Start API**:
   ```bash
   cd src/api/BuildTrack.Api
   dotnet run
   ```

   API will be available at `https://localhost:7108`

### Frontend Setup

1. **Serve static files** (using Live Server or any HTTP server):
   ```bash
   cd src/web
   # Use VS Code Live Server or:
   python -m http.server 5501
   ```

2. **Open browser**: `http://127.0.0.1:5501`

### First Time Setup

1. Click "Sign up" on login page
2. Fill in:
   - Full Name
   - Email
   - Workspace Name (your company/team)
   - Password (min 8 chars, uppercase, digit)
3. Check API console logs for 6-digit verification code
4. Enter code to verify and auto-login
5. You're now an Admin in your workspace!

## API Documentation

Swagger UI available at: `https://localhost:7108/swagger`

## Key Endpoints

### Auth
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/verify-email` - Verify email with code
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

### Projects
- `GET /api/v1/projects` - List projects
- `GET /api/v1/projects/{id}` - Get project details
- `POST /api/v1/projects` - Create project from template
- `PATCH /api/v1/milestones/{id}` - Update milestone

### Documents
- `POST /api/v1/requirements/{reqId}/upload-url` - Get upload URL
- `POST /api/v1/documents/confirm` - Confirm upload
- `POST /api/v1/documents/{id}/approve` - Approve document
- `POST /api/v1/documents/{id}/reject` - Reject document

### Users
- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create user (Admin only)
- `GET /api/v1/users/me/assignments` - Get my assignments

### Notifications
- `GET /api/v1/notifications` - List notifications
- `PATCH /api/v1/notifications/{id}/read` - Mark as read

## Architecture Highlights

### Backend
- **Clean Architecture**: Domain → Infrastructure → API layers
- **Workspace Isolation**: Global EF query filter ensures data isolation
- **Integration Events**: Outbox pattern for reliable automation triggers
- **Pre-signed URLs**: Direct S3 uploads without proxying through API
- **JWT Claims**: User ID, workspace ID, role in token

### Frontend
- **Vanilla JS with ES Modules**: No framework overhead
- **XState for state management**: appMachine handles auth flow
- **Dynamic imports**: Code splitting for pages
- **API service layer**: Centralized fetch with auth
- **Responsive CSS**: Modern grid/flexbox layouts

## Security Features

- Password hashing (ASP.NET Identity)
- JWT with refresh token rotation
- Email verification required
- Role-based authorization
- Workspace-level data isolation
- File type/size validation
- Pre-signed URL expiration (5 minutes)

## Next Steps

1. **Run database migration** for email verification
2. **Implement automation worker** to process integration events
3. **Add document upload UI** with drag & drop
4. **Build approval workflow UI**
5. **Create contributor portal** for assigned tasks
6. **Add email notifications** for key events

## Testing

### Manual Testing Checklist
- [ ] Sign up new user
- [ ] Verify email with code
- [ ] Login as verified user
- [ ] Create project from template
- [ ] View project details
- [ ] Add timeline comment
- [ ] View team members
- [ ] View notifications
- [ ] Logout and login again

### Seed Data
The database is seeded with:
- Sample skills
- Document types (PDF, Image, CAD)
- Milestone types
- Project types with templates
- Admin user (from signup)

## Known Issues

1. Database migration pending for email verification fields
2. Document upload UI not yet implemented
3. Automation worker not processing events
4. Email notifications not being sent
5. New project modal is placeholder

## Performance Targets (P0)

- Grid load: <2s for 200 projects × 15 milestones
- Project details: <300ms
- API response: <500ms p95

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Development Notes

- API runs on HTTPS with self-signed cert (trust in browser)
- CORS configured for `http://127.0.0.1:5501`
- Email service logs to console if SMTP not configured
- S3 service requires MinIO or AWS credentials
