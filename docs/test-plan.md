# Test Plan

## Scope
Key integration and E2E test cases for BuildTrack MVP.

## Authentication & Authorization (A1-A2)
- **Entities (B1, B2, B3)**
  - CRUD operations for skills, milestone/document types, templates.
  - Template application creates milestones and requirements with offsets.
- **Projects & Milestones (C1, C2, C3)**
  - Project creation from template, manual overrides, audit logs.
  - Milestone edits update status, due dates, assignments, flags; overdue recalculation.
  - Timeline events created from comments; visibility in drawer/details.
- **Documents & Approvals (D1, D2)**
  - Presigned upload flow with checksum, size, type enforcement.
  - Approval/rejection transitions, notifications, version history.
- **Grid & Drawer (E1, E2, E3)**
  - Grid performance at 200×15 dataset; keyboard navigation.
  - Context menu role gating; summary drawer data accuracy and focus behavior.
- **Contributor Portal (G1)**
  - Assigned milestones only; upload/comment parity with PM view.
- **Automations (H1–H3)**
  - Auto-complete rule idempotency; due-soon scheduler emissions.
  - Rule builder CRUD and execution (P1), scheduler time-travel tests.
- **Notifications (I1, I2)**
  - Email template rendering; in-app feed unread counts and polling.
- **Calendar (J1)**
  - Date range accuracy; drawer launch from calendar events.
- **Analytics (K1)**
  - Aggregation correctness; CSV export matches displayed data.
- **Admin & Audit (L1, L2)**
  - User lifecycle; audit log entries for sensitive actions.
- **Performance & Hardening (M1)**
  - Database indexes, rate limiting, CSP, accessibility audit.
- **DevOps & Tooling (O1, O2)**
  - Docker-compose spin-up, migrations auto-apply, CI workflow success path.

## Test Phases
1. **Unit Tests**: Domain services, validators, automation evaluator, permission guards.
2. **Integration Tests**: Minimal API endpoints using Testcontainers (Postgres, MinIO stub), verifying multi-tenant isolation.
3. **End-to-End Tests**: Playwright covering golden path Create→Upload→Approve→Automation→Email plus failure path (reject document).
4. **Performance Tests**: Seed 200×15 projects; measure grid and upload throughput.
5. **Security Tests**: IDOR attempts, token revocation, rate limiting, CSP checks.

## Tooling
- xUnit + Testcontainers for API.
- Playwright for browser flows.
- k6 or artillery for performance scripts (optional).
- Axe-core for accessibility scanning.

## Reporting
- CI pipeline publishes test results and coverage.
- Failures linked back to story/task IDs for traceability.
