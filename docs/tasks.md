Below is a **detailed implementation plan** for the BuildTrack MVP using **.NET 9** for the API/service layer and **vanilla HTML/JS/CSS** on the client with **XState** for state and routing. It includes architecture decisions, statecharts, routes, a prioritized backlog, and user stories with tasks.

---

## 1) Technology & key decisions

### Backend (.NET 9)

* **Runtime:** .NET 9 / ASP.NET Core 9 (Minimal APIs).
* **Persistence:** PostgreSQL (Npgsql, EF Core 9 with global query filters for workspace scoping).
* **Storage:** S3-compatible (AWS S3/MinIO) using pre‑signed URLs.
* **Messaging/Jobs:** BackgroundService with a queue + **Quartz.NET** for scheduled jobs (due-soon scans).
* **Email:** SendGrid (SMTP fallback).
* **Auth:** JWT (Access + Refresh); ASP.NET Identity Core (simple user table) + password login (SSO later).
* **Validation:** FluentValidation.
* **Documentation:** Swashbuckle/Swagger.
* **Observability:** Serilog + OpenTelemetry (HTTP + DB traces).
* **Security:** Workspace/tenant in claims; per-entity ownership checks; audit log.

### Frontend (vanilla)

* **Build:** native ES Modules for dev; **esbuild** (or Vite in “library mode”) for prod bundling.
* **State & routing:** **XState v5** (app machine + router machine).
* **Date/Time:** dayjs.
* **UI helpers:** floating-ui (menus/tooltips), pdf.js (PDF preview), clusterize.js (table virtualization), hotkeys-js (keyboard), nanoid (ids).
* **Styling:** CSS custom properties; BEM naming; prefers-color-scheme support.
* **Accessibility:** ARIA for menus/dialogs; color + icon cues.

---

## 2) High‑level architecture & repo layout

```
/src
  /Api               // ASP.NET Core minimal APIs, endpoints, Swagger
  /Application       // Command/query handlers, domain services, validators
  /Domain            // Entities, enums, value objects, policies
  /Infrastructure    // EF Core, repositories, S3, email, Quartz jobs
  /Worker            // BackgroundService host for automations & due checks
  /Web               // Static client (index.html, assets, /js, /css)
/tests
  /Api.Tests         // xUnit integration tests (WebApplicationFactory)
  /Application.Tests // unit tests
  /E2E               // Playwright end‑to‑end tests
```

**Cross‑cutting:**

* **Outbox table** (`integration_events`) written in TX for event triggers; Worker reads & executes automation rules idempotently.
* **Global EF QueryFilter:** `entity.WorkspaceId == user.WorkspaceId`.

---

## 3) Routing map (client)

```
/              -> Overview (Projects Grid)
/analytics
/team/members
/team/roles
/projects/active
/projects/archived
/projects/templates
/projects/:projectId           -> Project Details (tabs)
/documents                     -> Global documents inbox
/calendar
/messages
/auth/login
```

---

## 4) Core statecharts (XState)

### 4.1 App machine (root)

```
appMachine
  states: unauthenticated, authenticating, authenticated
  on: LOGIN.SUBMIT -> authenticating
      AUTH.SUCCESS -> authenticated
      AUTH.FAIL    -> unauthenticated
  services: fetchSession, refreshToken
  actions: setUser, clearUser
```

### 4.2 Router machine (child of authenticated)

```
routerMachine
  context: { route, params, query }
  states: overview, analytics, teamMembers, teamRoles, projectsActive, projectsArchived,
          templates, documents, calendar, messages, projectDetails
  transitions sync with History API (POP/PUSH); guards validate params
```

### 4.3 Grid machine

```
gridMachine
  context: { filters, sort, page, rows, columns, selection }
  states: loading -> ready
  on:
    FILTER.CHANGE / SORT.CHANGE -> loading (refetch)
    CELL.CLICK -> send to drawerMachine.open({projectId, milestoneId})
    CELL.MENU  -> open contextMenuMachine
```

### 4.4 Drawer, Upload & Approval

```
drawerMachine (project summary)
  states: closed, opening, open
uploadMachine
  states: idle -> requestingUrl -> uploading -> verifying -> done|error
approvalMachine
  states: pending -> approving -> approved | rejecting -> rejected
```

### 4.5 Automations

```
automationMachine
  states: list -> editing -> testing -> saving -> list
```

---

## 5) API surface (initial)

**Auth**

* `POST /api/v1/auth/login` → JWT
* `POST /api/v1/auth/refresh`
* `POST /api/v1/auth/logout`
* `GET  /api/v1/me` → user + workspace

**Entities**

* `GET/POST/PATCH /api/v1/entities/skills`
* `GET/POST/PATCH /api/v1/entities/project-types`
* `GET/POST/PATCH /api/v1/entities/milestone-types`
* `GET/POST/PATCH /api/v1/entities/document-types`
* `GET/POST /api/v1/templates` (versioned)

**Projects & milestones**

* `POST /api/v1/projects` (from template)
* `GET  /api/v1/projects?filter=...`
* `GET  /api/v1/projects/{id}`
* `PATCH /api/v1/projects/{id}`
* `POST /api/v1/projects/{id}/milestones`
* `PATCH /api/v1/milestones/{id}` (status, due, flags, assignment)
* `POST /api/v1/timeline` (comment/event)

**Documents**

* `POST /api/v1/requirements/{reqId}/upload-url` (pre-signed PUT)
* `POST /api/v1/documents/confirm` ({reqId, key, filename, size, checksum})
* `POST /api/v1/documents/{docId}/approve`
* `POST /api/v1/documents/{docId}/reject`
* `GET  /api/v1/documents?status=Pending`

**Automations**

* `GET/POST/PATCH /api/v1/automations`
* `POST /api/v1/automations/{id}/test`

**Notifications**

* `GET /api/v1/notifications`
* `PATCH /api/v1/notifications/{id}/read`

**Admin & Users**

* `GET/POST /api/v1/users`
* `PATCH /api/v1/users/{id}` (role, skills, active)

---

## 6) Prioritized delivery plan (P0→P2)

* **P0 (Foundations & critical flows)**
  Auth/RBAC, Entities, Templates, Project creation, Milestones, Documents upload/approve, Overview Grid v1, Summary Drawer, Contributor portal v1, Email notifications, Automations (document approved → milestone complete), Audit log, CI/CD.

* **P1 (Usability & breadth)**
  Global Documents inbox, Calendar view, Project Details tabs, Bulk actions on grid, Due-soon scheduler, In‑app notifications feed, Analytics v1, Virtualization/perf pass, Import/export CSV.

* **P2 (Polish & resilience)**
  Rule testing UI, Automation logs, Digest emails, Accessibility & keyboard mastery, Error budgets & alerting, Soft delete/archive, Advanced filters.

---

## 7) User stories & tasks (by epic)

Each story includes **acceptance criteria (AC)** and **tasks** split **BE** (backend), **FE** (frontend), **QA**. Priority tags: **P0/P1/P2**.

### EPIC A — Authentication, Workspace, RBAC (P0)

**A1. Login as a user**
*As a* user *I want* to log in with email/password *so that* I can access my workspace.

* **AC:** Valid credentials yield JWT (access+refresh). Invalid returns 401. Session persists with refresh.
* **BE tasks:**

  * ASP.NET Identity setup; password hashing.
  * `/auth/login`, `/auth/refresh`, `/me`.
  * Seed Admin and PM users.
* **FE tasks:**

  * authMachine (unauthenticated → authenticated).
  * Login form, error handling.
  * Token storage (memory + refresh; no localStorage for access tokens; store refresh in httpOnly cookie).
* **QA:** happy path, lockout after N attempts, refresh flow.

**A2. Role enforcement**

* **AC:** Admin/PM/Contributor capabilities enforced server-side; forbidden actions return 403.
* **BE:** Authorization policies; workspace query filters; permission unit tests.
* **FE:** Hide UI for forbidden actions.
* **QA:** Matrix checks per role.

---

### EPIC B — Entities management (Skills, Types, Templates) (P0)

**B1. Manage Skills**

* **AC:** Admin can create/edit/disable skills; PM can assign skills to users; shown in contributor pickers.
* **BE:** CRUD endpoints, EF tables.
* **FE:** Simple forms; list + inline edit.
* **QA:** Uniqueness, disable impacts pickers.

**B2. Milestone & Document Types**

* **AC:** Define name + defaults (required/optional, allowed extensions).
* **BE:** CRUD + validation; seed starter types.
* **FE:** Forms; chip-style extension inputs.
* **QA:** File-type enforcement verified on upload.

**B3. Project Type templates**

* **AC:** Template defines ordered milestones with due offsets & required documents. Version is stored.
* **BE:** Template entities; apply template to project creation.
* **FE:** Template editor (drag to reorder; simple list + move up/down for MVP); persist.
* **QA:** Create/edit template; create project → milestones prepopulated correctly.

---

### EPIC C — Projects & Milestones (P0)

**C1. Create project from template**

* **AC:** PM provides name, type, start date, owner; milestones & due dates calculated.
* **BE:** `POST /projects`; service to materialize milestones & requirements.
* **FE:** New Project modal; date picker; success → go to Details.
* **QA:** Start-date change recalculates due offsets.

**C2. Edit milestone**

* **AC:** PM can change due date, assign contributors, toggle Blocked/Failed Check, Mark Done.
* **BE:** `PATCH /milestones/{id}` with guards; audit entry.
* **FE:** Inline edit form within drawer and details page; confirm dialogs.
* **QA:** Overdue derived state updates on next render.

**C3. Timeline events & comments**

* **AC:** Posting a comment creates a timeline event; visible in drawer and details.
* **BE:** `POST /timeline`; event types enum.
* **FE:** Comment input, list, timestamps.
* **QA:** Permissions (contributors can comment only on assigned milestones).

---

### EPIC D — Documents & Approvals (P0)

**D1. Upload required document**

* **As a** Contributor/PM **I want** to upload a file for a milestone requirement.
* **AC:** Client gets pre‑signed URL; upload progress; server confirms & sets status=Pending Review. Versioning increments.
* **BE:** `/requirements/{reqId}/upload-url`, `/documents/confirm`; S3 client; checksum; virus-scan stub.
* **FE:** `uploadMachine` (xhr for progress) with drag&drop zone; status badges (Not Provided / Pending / Approved / Rejected).
* **QA:** Large file (25MB) upload; blocked extension rejected locally and server-side.

**D2. Approve/Reject document**

* **AC:** PM can Approve or Reject with reason; history preserved; automation can fire.
* **BE:** Approve/Reject endpoints; write `document_approved`/`rejected` events to outbox.
* **FE:** Preview with pdf.js (PDF) or image; approval buttons; reason modal.
* **QA:** Version rollbacks (choose older version as current) P1.

---

### EPIC E — Overview Grid & Summary Drawer (P0)

**E1. Grid portfolio view**

* **AC:** Rows=projects, Columns=milestones; cell colors (green=Completed, red=Overdue/Failed check, transparent otherwise). Sticky first columns.
* **BE:** `/projects?include=milestoneGrid` endpoint returns compact matrix; endpoint efficient for 200×15.
* **FE:** Virtualized table (clusterize.js) + CSS grid; cell tooltip; keyboard nav; `gridMachine` and `contextMenuMachine`.
* **QA:** p95 <2s with seeded data; keyboard navigation.

**E2. Cell context menu**

* **AC:** Down-arrow opens menu with role-aware actions (Upload, Mark Done, Add Comment, Assign).
* **FE:** floating‑ui anchored menu; action dispatch to other machines.
* **QA:** Menu content varies by role & assignment.

**E3. Project Summary Drawer (cell click)**

* **AC:** Right drawer shows mini timeline, stakeholders, contributors, outstanding requirements, link to Details.
* **FE:** `drawerMachine`; ESC to close; deep-link `#drawer=projectId,milestoneId`.
* **QA:** Opens <300ms; back button closes.

---

### EPIC F — Project Details (P1)

**F1. Details tabs** (Overview, Timeline, Milestones, Documents, Contributors, Settings)

* **AC:** Each tab fetches only what it needs; actions align with grid.
* **BE:** Single `GET /projects/{id}` with `include=` query; additional endpoints already exist.
* **FE:** Tabbed UI (no framework); hash-based tab route inside details state.
* **QA:** Switching tabs preserves scroll and back button.

---

### EPIC G — Contributor Portal (P0)

**G1. “Assigned to me” list**

* **AC:** Contributor sees milestones where assigned, with due dates & requirements.
* **BE:** `GET /me/assignments`.
* **FE:** Lightweight list; upload & comment actions inline.
* **QA:** No access to unrelated projects (try guessing IDs).

---

### EPIC H — Automations (P0→P1)

**H1. Auto-complete on approvals (P0)**

* **AC:** When all required docs approved and checklist done, system marks milestone Completed once. Email stakeholders.
* **BE:** Rule evaluator in Worker; subscribe to outbox events; idempotency key.
* **FE:** Simple rule toggle in project settings (“Auto-complete milestones when requirements are approved”).
* **QA:** Edge cases (partial approvals, rollback).

**H2. Rule builder (P1)**

* **AC:** Create rules: Triggers (status changed, doc uploaded/approved/rejected, due-soon), Conditions (project/milestone/doc type), Actions (mark status, send email, assign, change due date, create timeline event).
* **BE:** `/automations` CRUD; JSON schema for rules; evaluator supports AND/OR.
* **FE:** 3-step builder; test run (P2).
* **QA:** Logs visible; rule executes once per event.

**H3. Due‑soon scheduler (P1)**

* **AC:** X days before due, if not completed → email PM; add timeline event; mark “At Risk” flag.
* **BE:** Quartz job scanning milestones daily; emits `due_soon` events.
* **QA:** Time travel tests using fixed clock.

---

### EPIC I — Notifications (P1)

**I1. Email templates**

* Assignment, Upload received, Approved/Rejected, Due soon/Overdue, Milestone completed.
* **BE:** Template renderer with handlebars; SendGrid provider.
* **QA:** Delivery + content checks.

**I2. In‑app feed (Messages)**

* **AC:** Bell icon shows unread; Messages page lists items; mark all read.
* **BE:** `/notifications`; create on significant events.
* **FE:** message list; optimistic read.
* **QA:** Realtime optional (poll 30s).

---

### EPIC J — Calendar (P1)

* **AC:** Monthly/weekly view of milestone due dates; click opens drawer.
* **FE:** Minimal calendar (no framework) or tiny lib (Pikaday/Vanilla Calendar).
* **QA:** Timezones via dayjs; navigation persists state.

---

### EPIC K — Analytics (light) (P1)

* **AC:** Counts for projects by status, milestones completed vs. overdue, avg approval time; CSV export.
* **BE:** Aggregation queries & cache table.
* **FE:** Simple cards + bar chart (canvas).
* **QA:** Compare numbers to fixtures.

---

### EPIC L — Admin, Users, Audit (P0)

* **L1. Users list & invite**: Admin can create users, set role, set skills, activate/deactivate.
* **L2. Audit log**: View filterable log of important actions.
* **Tasks:** Endpoints + list UIs; audit middleware.

---

### EPIC M — Performance, A11y, Hardening (P1–P2)

* Virtualization tuning, DB indexes, N+1 checks, ARIA, keyboard flows, rate limiting, CORS, CSP, S3 presigned TTLs.

---

## 8) Detailed task breakdown (selected, implementation‑level)

### Backend foundations (P0)

* [ ] Create solution, projects, DI setup, options pattern.
* [ ] EF Core DbContext + migrations; apply **WorkspaceId** global filter.
* [ ] Seed: roles (Admin/PM/Contributor), skills, sample templates.
* [ ] Generic repository or MediatR-style handlers (choose one; keep thin).
* [ ] Serilog + OpenTelemetry; correlation ids.
* [ ] Swagger with auth button; response types/validation errors.

### Documents (P0)

* [ ] S3 client service; `GenerateUploadUrl(requirementId, md5, size)`.
* [ ] Virus scan stub (toggle) → flag document if failed.
* [ ] Save `Document` row on confirm; set requirement state to **Pending**; fire outbox event `document_uploaded`.
* [ ] Approval service: transition, set reviewer, set version current, write outbox event.

### Automations worker (P0)

* [ ] Outbox table & polling with `FOR UPDATE SKIP LOCKED`.
* [ ] Handlers: `document_approved` → check-all-requirements → mark milestone Completed → send emails → timeline event.
* [ ] Idempotency with `(eventId, action)` keys.

### Due‑soon (P1)

* [ ] Quartz job daily: `now + Xd`, `status != Completed`. Emit `due_soon` per milestone.

### Email (P0)

* [ ] Provider abstraction + SendGrid implementation; templates in `/Infrastructure/Templates`.
* [ ] Unit tests with test double.

### Security (P0)

* [ ] JWT issuance, refresh rotation, revocation on logout.
* [ ] Authorization attributes per endpoint; policy `MustBeAssignedToMilestone` for contributor uploads.

### Frontend foundations (P0)

* [ ] `index.html` shell (sidebar layout like screenshot).
* [ ] App bootstrap: load config, check `/me`, start **appMachine**.
* [ ] **routerMachine**: parse `location.pathname`; push/replace state; handle POP.
* [ ] Shared utilities: fetch wrapper with auth, error toasts, dayjs, nanoid.
* [ ] UI primitives: Drawer, Menu, Tooltip, Modal, Toast.

### Grid (P0)

* [ ] Build grid structure (CSS grid for columns; clusterize.js for rows).
* [ ] Cell rendering from matrix payload; tooltip (floating-ui).
* [ ] Down‑arrow button + `contextMenuMachine`.
* [ ] Keyboard: arrow keys move focus; Enter opens drawer; Shift+Enter opens menu.

### Drawer (P0)

* [ ] Summary: name/code, owner, %complete, next due; mini timeline (last 5 events); stakeholders; outstanding requirements; actions.
* [ ] Link to details (`/projects/:id`).

### Contributor portal (P0)

* [ ] “Assigned to me” page; upload zones per requirement; comment box.
* [ ] Minimal header with logout.

### Uploads (P0)

* [ ] `uploadMachine` with XHR progress; server confirm; error handling & retry.
* [ ] pdf.js viewer for PDFs; native img for images.

### Approvals (P0)

* [ ] Approval UI in drawer & details; reason modal for reject.
* [ ] Version history list with badges; select “current” (P1).

### Notifications (P1)

* [ ] Messages page; bell badge; poll endpoint; mark read.

### Calendar (P1)

* [ ] Minimal calendar grid; events from `/projects?dueBetween=…`; click → drawer.

### Analytics (P1)

* [ ] Cards & bar chart (Canvas API); CSV export.

### DevOps (P0)

* [ ] Dockerfiles (API + Worker + Nginx for static Web).
* [ ] GitHub Actions: build, unit tests, integration tests, Docker build, push, deploy.
* [ ] Environment config via `IOptions`; secrets via vault.
* [ ] Database migration step on deploy.
* [ ] S3 bucket & CORS for presigned PUT.

---

## 9) Acceptance criteria summary (critical P0)

1. **Create → Upload → Approve → Auto-Complete** works end-to-end; timeline + emails emitted; audit entries recorded.
2. Grid shows correct colors and loads **≤2s p95** for 200×15.
3. Contributor only sees/acts on assigned milestones; forbidden operations 403.
4. Pre‑signed upload, versioning, and preview function for PDF/images; file type enforcement works.
5. Automations fire exactly once per event (idempotent).
6. Swagger docs complete; Postman collection exported.
7. E2E (Playwright) covers the golden path and one failure path.

---

## 10) Story map by release

### **Release v0.1 (P0) – Core MVP**

* A1–A2, B1–B3, C1–C3, D1–D2, E1–E3, G1, H1, L1–L2 + DevOps foundations.

### **Release v0.2 (P1) – Breadth & UX**

* F1 (Details tabs), H3 (Due‑soon), I1–I2 (Notifications), J1 (Calendar), K1 (Analytics), Grid bulk actions + filters.

### **Release v0.3 (P2) – Polish**

* H2 rule builder UI improvements + test runs, digest emails, accessibility/keyboard mastery, import/export CSV, performance hardening, archive flows.

---

## 11) Database schema notes (keys/indexes)

* FK all entities to `workspace_id` (composite indexes: `(workspace_id, project_id)`, `(workspace_id, milestone_id)`).
* Indexes:

  * `milestones (workspace_id, due_date, status)` for due‑soon scans.
  * `documents (requirement_id, uploaded_at DESC)` for version lookups.
  * `timeline_events (project_id, created_at DESC)`.
* Outbox: `integration_events(id uuid PK, type, payload jsonb, created_at, processed_at, attempts)`, index on `processed_at IS NULL`.

---

## 12) API contracts (examples)

```http
POST /api/v1/projects
Body: { name, code?, startDate, projectTypeId, ownerUserId, stakeholders: [email], tags?: [] }
Resp: 201 { id, ... }

PATCH /api/v1/milestones/{id}
Body: { status?, dueDate?, assignedUserIds?, flags?: { blocked?, failedCheck? } }

POST /api/v1/requirements/{reqId}/upload-url
Body: { fileName, contentType, size, md5 }
Resp: { url, headers, key, expiresAt }

POST /api/v1/documents/confirm
Body: { reqId, key, fileName, size, checksum }
Resp: { documentId, status: "Pending" }
```

---

## 13) Frontend interaction contracts

* **Events:**

  * `GRID.CELL_MENU.OPEN`, `GRID.CELL.CLICK`, `UPLOAD.START`, `APPROVAL.APPROVE`, `APPROVAL.REJECT`, `ROUTE.NAVIGATE`, `AUTH.LOGIN.SUBMIT`.
* **Services:** fetchers returning `{data, error}`; machines use invoke with cancellation on state exit.
* **Error pattern:** toast + non-blocking UI; 401 triggers `AUTH.LOGOUT`.

---

## 14) Testing strategy

* **Unit (xUnit):** services/validators; automation evaluator; permissions guards.
* **Integration:** Minimal API endpoints with `WebApplicationFactory` + in‑memory S3 test double; database spins up via Testcontainers (Postgres).
* **E2E (Playwright):**

  1. PM logs in → creates project from template.
  2. Contributor uploads doc (via presigned PUT).
  3. PM approves → milestone auto-complete → email captured via test SMTP.
  4. Grid reflects green cell; drawer shows correct stats.
* **Performance:** seed 200 projects × 15 milestones; run load script; measure p95.
* **Security:** authorization tests, IDOR checks.

---

## 15) Risk & mitigation quick list

* **File preview complexity** → PDF/images only; DOCX download.
* **Automation loops** → outbox idempotency + guard against self-trigger within 5 minutes.
* **Virtualization complexity** → use clusterize.js; server sends concise matrix.
* **Multi‑tenancy leaks** → enforce workspace checks at DB and service layer; heavy integration tests.

---

## 16) Definition of Done (project)

* All **P0** stories shipped to staging with CI/CD, telemetry, and seeded demo data.
* Swagger current; README contains run/dev instructions.
* 0 open P0/P1 defects; E2E suite green; performance target met.
* Security review (JWT, CORS, S3 policies, CSP) complete.

---

### Want this converted into a **Jira‑ready backlog** (CSV) or **XState machine skeletons** for the app/router/upload flows? I can generate those immediately.
