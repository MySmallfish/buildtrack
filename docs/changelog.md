# Changelog

All notable user-facing changes to BuildTrack.

## [Unreleased] - v0.1 (P0 MVP)

### Added
- **Authentication & Security**
  - Email/password login with JWT authentication
  - Refresh token rotation for secure session management
  - Role-based access control (Admin, Project Manager, Contributor)
  - Multi-tenant workspace isolation

- **Project Management**
  - Create projects from templates with automatic milestone generation
  - Project overview grid showing all active projects
  - Project details with timeline, milestones, and documents
  - Milestone tracking with status, due dates, and assignments
  - Timeline events and comments on projects and milestones

- **Document Management**
  - Upload documents via secure presigned URLs (S3-compatible storage)
  - Document versioning with full history
  - Approve/reject workflow for document review
  - Document requirements linked to milestones
  - File type validation and size limits

- **Entity Management**
  - Skills management for team members
  - Document types with allowed extensions
  - Milestone types with requirement templates
  - Project types with milestone templates
  - Template versioning for project creation

- **User Interface**
  - Modern, responsive web interface
  - Sidebar navigation with workspace context
  - Projects grid with status indicators
  - Login/logout with session persistence
  - Real-time status updates

- **API & Integration**
  - RESTful API with OpenAPI/Swagger documentation
  - JWT-based authentication for all endpoints
  - Workspace scoping on all queries
  - Integration events for automation triggers

### Technical
- .NET 9 backend with Minimal APIs
- PostgreSQL database with EF Core 9
- S3-compatible object storage (MinIO/AWS S3)
- XState v5 for frontend state management
- Vanilla JavaScript with ES modules
- Docker Compose for local development

## Future Releases

### v0.2 (P1) - Planned
- Automation rules with trigger/condition/action builder
- Due-soon notifications and scheduler
- In-app notifications feed
- Calendar view of milestone due dates
- Analytics dashboard v1
- Grid bulk actions and advanced filters
- Contributor portal enhancements

### v0.3 (P2) - Planned
- Automation testing and dry-run
- Digest email notifications
- CSV import/export
- Project archiving and soft delete
- Advanced accessibility features
- Performance optimizations
