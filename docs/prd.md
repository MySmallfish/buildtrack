Below is a **Detailed Product Requirements Document (PRD)** for the MVP of a **Building Projects Tracking** platform. It is structured so engineering, design, and QA can start implementation immediately.

---

## 0) Product name (working)

**BuildTrack**

---

## 1) Problem, goals, and success criteria

**Problem**
Construction and building projects involve many external contributors and milestone-gated documents. Project managers lack a unified, real‑time picture of milestone status and a lightweight way to collect/approve documents and automate routine actions.

**MVP Goals**

1. Provide a **projects grid** that shows milestone status at a glance (green = completed, red = overdue/failed check, transparent = not complete/within time).
2. Let **Project Managers** create projects from templates, define milestones, collect/approve required documents, add timeline events, and mark progress.
3. Give **Contributors** a simple portal to upload required files and report status for their assigned milestones.
4. Enable **Automations** that react to events (e.g., when document approved → mark milestone done; when milestone done → email stakeholders).
5. Provide **User & entity management**: roles/permissions, dynamic lists (skills, project types, milestone types), and reference entities.

**Success Metrics (MVP)**

* Time to first project setup < **10 minutes** using templates.
* 90% of milestones have their required documents uploaded via the platform (not email).
* Median time from contributor upload to approval < **48 hours**.
* PM-reported satisfaction ≥ **8/10** in pilot.
* < **2s** p95 load for dashboard with 200 projects and 15 milestones each.

---

## 2) Users & personas

* **Admin** – owns workspace configuration, users, entities, automations, and billing.
* **Project Manager (PM)** – creates projects, configures milestones, invites contributors, reviews documents, marks milestones, posts updates, runs automations.
* **Contributor** – external party (solo engineer, constructor, architect, subcontractor, automated uploader) who uploads documents and reports milestone updates for assigned items only.
* **Stakeholder/Viewer (future)** – read-only access to dashboards and summaries (not in MVP unless trivial to include).

---

## 3) Scope (MVP)

### In scope

* Multi-tenant workspace with users and RBAC (Admin, PM, Contributor).
* Projects grid (dashboard) with milestone columns and cell-level context menu.
* Project creation from **project-type templates** (predefined milestone sequence).
* Milestones: status, due dates, assigned contributors, required documents/checklists, timeline events & comments.
* Document intake: upload, versioning, preview (PDF/images), approval workflow (Pending → Approved/Rejected).
* Automation: rule builder with **Triggers**, **Conditions**, **Actions**.
* Notifications: email (and in-app feed) for key events.
* Entities management: Skills, Project Types, Milestone Types, Document Types, etc.
* Search, filters, and basic analytics (counts, completion rates).
* Audit log for sensitive actions.

### Out of scope (MVP)

* Advanced scheduling (Gantt/CPM), cost/budgeting, change orders.
* RFIs/Submittals modules beyond simple document handling.
* Native mobile apps (responsive web only).
* Real-time co-edit (we’ll use optimistic updates + polling/websockets for status).

---

## 4) Information architecture & navigation

**Layout**

* **Left sidebar** modeled on the second screenshot:

  * Search (global)
  * **Navigation**

    * Overview (projects grid)
    * Analytics
    * Team

      * Members
      * Roles & Permissions
    * Projects

      * Active Projects
      * Archived
      * Templates
    * Documents
    * Calendar (read-only deadlines view)
    * Messages (in‑app notifications feed)
  * **Workspaces** (list, for multi-org tenants if enabled)
  * Profile section

**Top bar (Overview):** page title, filters, view switcher, bulk actions, “New Project” button.

---

## 5) Core user journeys

1. **PM creates a project from a template**

* New Project → pick Project Type template → preloads milestone sequence with due-date offsets & required documents → add stakeholders & contributors → create.

2. **Contributor uploads a required document**

* Receives assignment email → portal login → sees only assigned milestones & requirements → uploads file → status becomes “Pending Review” → PM notified.

3. **PM reviews and approves document**

* From project summary or grid cell menu → open requirement → preview file → Approve/Reject (with comment) → automation may mark milestone done if all requirements met.

4. **PM monitors progress**

* Overview grid shows green/red/transparent cells → click cell to open Project Summary drawer → see mini timeline, stakeholders, contributors, quick links → navigate to full details.

---

## 6) Detailed feature requirements

### 6.1 Projects grid (Overview)

**Purpose:** portfolio view to summarize many projects vs. milestones (inspired by the first screenshot’s clean grid).

**Structure**

* Rows: Projects.
* Columns: Milestones (from the active template for that project). “+” column at end for adding a milestone (PM-only).
* Sticky first columns:

  * Rank/Status icon (derived), Project Name (click opens Project Details), Location (optional), PM Owner, % Complete, Next Due.
* Milestone cells (per column):

  * **State color**:

    * Green = **Completed**
    * Red = **Overdue** (now > due date and not completed) **or** “Failed Check” (explicit flag)
    * Transparent = all other states (including Not Started, In Progress, Pending Review, Blocked, etc.) for MVP.
  * Tooltip on hover: Milestone name, due date, assigned contributors, last activity, outstanding requirements count.
  * **Click** the cell: open **Project Summary Drawer** (right-side) focused on that milestone with shortened timeline, stakeholders, contributors, statistics, and link to full Project Details.
  * **Chevron/Down arrow** in cell: opens **context menu** with:

    * Upload document (if requirements exist)
    * Mark Done (PM-only)
    * Add comment / Add timeline event
    * Assign contributor
    * View documents
    * Configure milestone (PM-only)
    * (Menu items are configurable per milestone type)
* Bulk actions: multi-select rows → Assign PM, Change status, Archive, Export CSV.
* Search: projects by name/code, stakeholder, contributor, tag.
* Filters: project type, PM owner, status (On Track, Overdue, Blocked), date ranges.
* Sorting: by Next Due, % Complete, Created date.
* Performance: virtualized table; render >200 rows × 15 columns under 2s p95.

**Acceptance**

* Cell colors accurately reflect rules.
* Context menu shows appropriate actions by role.
* Keyboard nav: arrow keys move selection; Enter opens drawer; Shift+Enter opens context menu.

---

### 6.2 Project creation & templates

* **Project Type** template defines:

  * Milestone sequence (ordered).
  * Default milestone durations & due-date offsets (e.g., “Foundation due +45 days from project start”).
  * Milestone Type (links to required document sets and default automation).
* During creation:

  * Fields: Name (required), Code (unique), Address/Location (optional), Start date (required), Project Type (required), PM Owner (required), Stakeholders (emails), Tags.
  * Template editor: drag/drop to reorder milestones, edit due offsets, add/remove requirements.
* After creation:

  * Due dates auto-calculated from Start date + offsets; editable per milestone.
  * Ability to add ad-hoc milestone to a project (non-template).

**Acceptance**

* Creating from template prepopulates milestones and requirements correctly.
* Editing or reordering milestones updates due dates accordingly (respect manual overrides).

---

### 6.3 Milestones

* Fields: Name, Milestone Type, Status, Due date, Actual completion date, Assigned contributors (list), Requirements (docs/checklist), Notes, Flags (Blocked, Failed Check).
* **Statuses (system):** Not Started, In Progress, Pending Review, Completed, Overdue (derived), Failed Check (explicit flag), Blocked (explicit flag).

  * **Display rules in grid:**

    * Green if **Completed**.
    * Red if **Overdue** (now > due AND not completed) OR **Failed Check**.
    * Transparent otherwise.
* **Completion logic (automatable):**

  * If **all required document requirements are Approved** AND no open checklist items → auto-mark **Completed** (configurable per milestone or globally).
  * Manual override: PM can Mark Done (logs reason).
* Checklist items (optional per milestone): text, optional “evidence” file.
* Timeline events (system-logged): creation, assignment changes, due-date changes, status changes, document uploads, approvals.

**Acceptance**

* Derived status “Overdue” recalculates every hour and on relevant updates.
* Manual override creates audit log entry.

---

### 6.4 Documents & approvals

* **Document Requirement**: defined on Milestone Type.

  * Fields: Document Type (dynamic list), Required vs Optional, Who can upload (Contributor role(s)), Who approves (PM or specific approver), Validation (file types, max size), Expiry (optional).
* **Upload UX**:

  * From cell context menu or Project Details → select requirement → drag & drop.
  * Multiple versions allowed; newest is “Under Review”.
  * Virus scan (stub in MVP), file type whitelist (PDF, JPG/PNG, DOCX).
  * Metadata: version, uploaded by, timestamp, checksum, file size.
* **Review UX**:

  * Preview (PDF/images inline); DOCX via download.
  * Actions: Approve, Reject (with reason), Request Changes.
  * Versioning: keep history; allow rollback selection as “current”.
* **States**: Not Provided → Pending Review → Approved / Rejected.

  * On Approve: trigger automations; potentially auto-complete milestone.
  * On Reject: notify uploader with comments; requirement returns to Not Provided or stays with status “Rejected” until new version uploaded.
* **Storage**: S3-compatible (bucket per tenant). Metadata in DB. Pre-signed URLs for secure download.

**Acceptance**

* Only assigned contributors/PM can upload to their allowed requirements.
* Approval transitions fire automations and update milestone if configured.
* Full version history visible with diffs (metadata diff; file diff out of scope).

---

### 6.5 Project Summary Drawer (cell click)

* Right-side overlay — never fully navigates away.
* Contains: project header (name, code, PM, % complete), quick stats (completed/total milestones, next due), **shortened timeline** (5 most recent events), stakeholders & contributors list (avatars or initials), outstanding document requirements, and **“Open Full Details”** button.
* Context actions: Mark milestone done, Upload, Add Comment, View Docs.

**Acceptance**

* Opens in <300ms; ESC closes; deep linkable via URL hash.

---

### 6.6 Project Details Page

* Tabs: **Overview** (progress, risks flags), **Timeline**, **Milestones** (table), **Documents**, **Contributors**, **Automations** (project-level rules), **Settings**.
* Milestones table includes: status, due vs. today, assigned, outstanding requirements, actions.
* Timeline: chronological feed of events; filterable; supports comment threads; @mentions (PMs & contributors).
* Documents: per milestone and all-project list; filters by status; bulk download (zip).
* Contributors: list with roles/skills; per-milestone assignment matrix.

---

### 6.7 Contributor portal

* Clean, minimal view.
* Shows **Assigned to Me** milestones & required documents with statuses and due dates.
* Actions: upload document/version, add comment, mark “Submitted” (sends for review), view feedback.
* Access: contributors see ONLY projects/milestones where assigned.
* No access to global grid or other projects.

**Acceptance**

* Contributor cannot view or infer unrelated projects or documents.
* Upload and comments are visible to PM immediately.

---

### 6.8 Automations (Events → Conditions → Actions)

**Rule Builder (Admin/PM)**

* **Triggers** (MVP):

  * Milestone status changed
  * Document uploaded
  * Document approved/rejected
  * Due date approaching (X days before; scheduled job)
  * New comment added (optional)
* **Conditions**:

  * Project Type equals …
  * Milestone Type equals …
  * Role of actor is …
  * Document Type is …
  * Status is …
* **Actions**:

  * Mark milestone as Completed
  * Set milestone status to Pending Review / Blocked / Failed Check
  * Send email to (PM/assignees/stakeholders/custom)
  * Assign contributor / Change due date (+/- days)
  * Create timeline event with text template
* **Rule evaluation**: synchronous for direct events; scheduled for date-based triggers.
* **Logging**: each run logged; failures retried with exponential backoff.

**Example rules**

* When **all required docs Approved** → **Mark milestone Completed** and **email stakeholders**.
* When **Document Rejected** → email uploader with PM comment.
* 3 days before **due date** and status != Completed → email PM and set cell “At Risk” flag (flag appears in tooltip; cell remains transparent per MVP color rule).

**Acceptance**

* Rules execute exactly once per triggering event; idempotent actions where relevant.

---

### 6.9 Notifications

* Email provider (SendGrid/SES).
* In-app notifications feed (bell icon + Messages list in sidebar).
* Digest option (daily summary) for PM in Settings (queued but optional in MVP).
* Email templates: assignment, upload received, approved/rejected, due soon/overdue, milestone completed.

---

### 6.10 User management, roles & permissions

**Roles (RBAC)**

* **Admin**: manage workspace, users, roles, entities, automations; full read/write.
* **Project Manager**: create/edit projects & milestones; review/approve docs; manage contributors; run automations; read everything in their workspace.
* **Contributor**: read/write on assigned milestones (upload, comment); read-only on their own submissions and feedback.

**Permissions Matrix (MVP)**

| Capability                      | Admin |   Project Manager |       Contributor |
| ------------------------------- | ----: | ----------------: | ----------------: |
| Create/Delete projects          |     ✓ |                 ✓ |                 – |
| Edit milestones                 |     ✓ |                 ✓ |                 – |
| Upload docs                     |     ✓ |                 ✓ | ✓ (assigned only) |
| Approve/Reject docs             |     ✓ |                 ✓ |                 – |
| Mark milestone done             |     ✓ |                 ✓ |                 – |
| View all projects               |     ✓ |                 ✓ |                 – |
| View assigned project/milestone |     ✓ |                 ✓ |                 ✓ |
| Manage users & roles            |     ✓ |                 – |                 – |
| Manage entities/templates       |     ✓ |     ✓ (templates) |                 – |
| Create automation rules         |     ✓ | ✓ (project-level) |                 – |
| View audit logs                 |     ✓ |                 ✓ |                 – |

**Skills (dynamic list)**

* Skills are tags mapped to users (Engineer, Constructor, Architect, Inspector, etc.).
* Used for assignment filtering and visibility in contributor list.

---

### 6.11 Entities management (Admin)

* **Skills** – CRUD.
* **Project Types** – CRUD; each stores default template, default stakeholders/roles, default automations.
* **Milestone Types** – CRUD; each stores default required documents & checklist template.
* **Document Types** – CRUD; file type rules, approver role defaults.
* **Templates** – versioned; changes don’t retroactively alter existing projects unless explicitly applied.

---

### 6.12 Documents page (global)

* Table of all documents across projects with filters by project, milestone, type, status, uploader, date.
* Quick actions: Approve/Reject (PM), open in project context.

---

### 6.13 Calendar

* Read-only monthly/weekly view of upcoming milestone due dates.
* Clicking an item opens the Project Summary drawer.

---

### 6.14 Analytics (lightweight)

* Counts: projects by status, milestones completed vs. overdue, average approval time.
* Per PM performance: average overdue days, completion rate.
* Export CSV.

---

## 7) Data model (MVP)

**Core entities**

* **Workspace**(id, name, plan, settings)
* **User**(id, name, email, role, active, skills[])
* **ContributorProfile**(user_id, company, external=true)
* **ProjectType**(id, name, description, template_id)
* **MilestoneType**(id, name, doc_requirement_templates[], checklist_template[])
* **DocumentType**(id, name, allowed_extensions[], max_size_mb, default_approver_role)
* **Template**(id, name, version, milestones[])

  * **TemplateMilestone**(name, milestone_type_id, due_offset_days, required_documents[], checklist_items[])
* **Project**(id, code, name, type_id, start_date, owner_user_id, stakeholders[], status, created_at)
* **Milestone**(id, project_id, name, milestone_type_id, due_date, status, assigned_user_ids[], blocked_flag, failed_check_flag, completed_at)
* **DocumentRequirement**(id, milestone_id, document_type_id, required:boolean, state, current_document_id)
* **Document**(id, requirement_id, version, storage_url, filename, uploaded_by, uploaded_at, status(Pending/Approved/Rejected), reviewer_id, reviewed_at, rejection_reason)
* **ChecklistItem**(id, milestone_id, text, required:boolean, done:boolean, evidence_document_id?)
* **TimelineEvent**(id, project_id, milestone_id?, type, message, created_by, created_at, payload_json)
* **AutomationRule**(id, workspace_id, scope(project/global), trigger, conditions_json, actions_json, enabled)
* **Notification**(id, user_id, type, title, body, link, read:boolean)
* **AuditLog**(id, actor_id, action, object_type, object_id, timestamp, diff_json)

**Derived fields**

* Milestone.overdue = now() > due_date && status != Completed
* Project.%complete = completed milestones / total milestones
* Project.next_due = min(due_date where not completed)

---

## 8) API design (REST; GraphQL optional later)

Base path: `/api/v1`

**Auth**

* JWT/OAuth2; email+password to start; SSO later.
* All endpoints require workspace scoping via token.

**Key endpoints (representative)**

* `POST /projects` – create project (from template_id)
* `GET /projects?filter=…` – list projects
* `GET /projects/:id` – project details
* `PATCH /projects/:id` – update metadata
* `POST /projects/:id/milestones` – add milestone
* `PATCH /milestones/:id` – update status, due date, assignment
* `POST /milestones/:id/requirements/:reqId/upload` – pre-signed URL, then confirm
* `POST /documents/:id/approve` / `/reject`
* `GET /documents?status=Pending` – inbox
* `POST /timeline` – add event/comment
* `GET /summary` – portfolio stats
* `POST /automations` / `PATCH /automations/:id/enable`
* `GET /entities/project-types` / `milestone-types` / `document-types`
* `POST /users` / `PATCH /users/:id` – role/skills
* `GET /notifications` / `PATCH /notifications/:id/read`

**Webhooks (optional in MVP)**

* `document.approved`, `milestone.completed`, `document.rejected`.

**Events (internal bus)**

* `document_uploaded`, `document_approved`, `milestone_status_changed`, `due_soon`, `comment_added`.

---

## 9) System architecture (proposed)

* **Frontend:** React + TypeScript (Next.js), component library (e.g., Radix/Headless UI). Data fetching via tRPC or REST. Table virtualization (TanStack Table + Virtual).
* **Backend:** Node.js (NestJS) or Python (FastAPI) – pick one; this PRD assumes **NestJS** for typed DI & decorators.
* **DB:** PostgreSQL (with row-level security for multi-tenancy).
* **Object storage:** S3-compatible (AWS S3, MinIO) with pre-signed URLs.
* **Queue/worker:** Redis + BullMQ for automations & scheduled jobs (due-soon, retries).
* **Auth:** JWT with refresh tokens; passwordless magic link optional.
* **Email:** SendGrid/SES.
* **Observability:** OpenTelemetry, logs to CloudWatch/ELK; metrics dashboard.

---

## 10) UX specifications & micro‑interactions

**Grid**

* Row height: 56px; fixed first column; horizontal scroll for many milestones.
* Cell content: status dot + title abbreviation; hover shows tooltip; chevron button at right edge (shows on hover & focus).
* Context menu: appears anchored to cell; keyboard accessible via Shift+Enter; contains role-gated actions.
* Empty state: “Create your first project” CTA.
* Error state: in-cell toast “Upload failed—retry”.

**Project Summary Drawer**

* Width 420px; focus trapped; close on ESC/Backdrop.
* Primary CTA button at top-right: “Open Project”.

**Contributor upload**

* Drag & drop zone; file size & type validation before upload.
* Progress bar; success banner with next steps.

**Accessibility**

* WCAG 2.1 AA; color not sole indicator (icons + tooltips + labels).
* Keyboard order, ARIA on menus and dialogs.

---

## 11) Automations UX details

* Rule list: name, status (enabled), last run, runs in last 7d, errors.
* Rule editor: 3-step wizard

  1. Choose Trigger
  2. (Optional) Add Conditions (builder with AND/OR groups)
  3. Choose Actions (multi-select)
* Test run: simulate with a recent event (dry run log).
* Safeguards: “Prevent infinite loops” (same rule cannot be triggered by its own action within 5 minutes unless explicitly allowed).

---

## 12) Security, privacy, compliance (MVP)

* **Multi-tenant isolation:** workspace_id column on every row; middleware filters; RLS policies in Postgres.
* **Access control:** role checks on endpoints; object-level checks (e.g., contributor assignments).
* **Documents:** server-side encryption at rest (SSE-S3 or SSE-KMS), TLS in transit, pre-signed URLs with short TTL (5 min).
* **Audit log:** critical actions recorded.
* **Backups:** daily DB backups; 7-day retention (configurable).
* **PII:** minimum collection (name, email); GDPR-ready exports/deletions (admin-initiated).

---

## 13) Non‑functional requirements

* **Performance:**

  * Dashboard p95 < 2s with 200×15 matrix.
  * Document upload start-to-available < 5s for 25 MB files.
* **Availability:** 99.5% target (MVP).
* **Scalability:** stateless API; scale horizontally; background queue for heavy work.
* **Localization:** English only (strings externalized).
* **Browser support:** latest Chrome/Edge/Safari + last 1 major Firefox.

---

## 14) Analytics & instrumentation

* Track events: project_created, milestone_mark_done, doc_uploaded, doc_approved, automation_fired, grid_cell_menu_opened, drawer_opened.
* KPIs (see §1) computed nightly and on-demand.

---

## 15) Acceptance criteria & test cases (representative)

### A) Grid status coloring

**Given** a milestone due yesterday and not completed
**When** the grid renders
**Then** the cell is red and tooltip shows “Overdue by 1 day”.

### B) Context menu permissions

**Given** a Contributor opens the grid
**Then** cell menu shows only “Upload document” and “Add comment” if they’re assigned to that milestone.

### C) Auto‑completion by approvals

**Given** a milestone requires 2 documents (A, B)
**And** both are Approved
**When** auto-complete rule is enabled
**Then** milestone status becomes Completed and a timeline event is added.

### D) Versioning

**Given** a contributor uploads v1 (Pending)
**When** PM Rejects with reason
**Then** contributor sees rejection message and can upload v2; history shows v1 Rejected and v2 Pending/Approved.

### E) Automations audit

**Given** a rule “On document approved → Mark milestone completed & email stakeholders”
**When** a document is approved
**Then** the rule run is logged with outcome=success and recipients listed.

### F) RLS data isolation

**Given** Contributor A belongs to Workspace X
**When** they attempt to access project from Workspace Y
**Then** API returns 404 (not found).

(Full test suite to include API contract tests, table keyboard navigation, email template rendering, and failure-path retries.)

---

## 16) Example data (seeds)

**Project Types & Milestones**

* *Residential Building*

  1. Design
  2. Permitting
  3. Site Preparation
  4. Foundation
  5. Structure
  6. MEP Rough‑In
  7. Finishes
  8. Inspection
  9. Handover

**Milestone Type → Required Documents (examples)**

* Permitting: Permit Application (PDF), Environmental Report, Insurance Certificate.
* Inspection: Inspector Report, Punch List Resolution.

---

## 17) Release plan

**v0.1 (Weeks 1–4)**

* Auth, RBAC, Entities, Project creation from templates, Milestones, Documents upload (no approvals), Basic grid (static columns), Summary Drawer (basic), Audit log.

**v0.2 (Weeks 5–8)**

* Document approvals & versioning, Automations (core triggers/actions), Notifications (email + in-app), Calendar, Global Documents page, Performance pass.

**v0.3 (Weeks 9–12)**

* Advanced grid (virtualization, filters/sort, bulk actions), Analytics, Contributor portal polish, Import/export CSV, Admin automation logs & dry run, Accessibility pass.

---

## 18) Risks & mitigations

* **Complex template logic** → Start with linear milestone sequences; avoid cross‑milestone dependencies for MVP.
* **File preview complexity** → PDF/images inline only; DOCX download.
* **Automation loops** → Add guardrails and idempotency keys.
* **Permission leaks** → Enforce RLS + comprehensive integration tests.

---

## 19) Open assumptions (to validate, but do not block MVP)

* One workspace per company; users can belong to multiple workspaces via invite.
* Email is sufficient for contributor notifications; SMS not required in MVP.
* No need for e‑signatures in MVP (can link to DocuSign later).

---

## 20) UI specifications summary (quick reference)

* **Sidebar**: as in the second screenshot; collapsible sections (Team, Projects).
* **Overview grid**: as in the first screenshot’s style—clean rows; milestone columns; colored status cells; in‑cell chevron menu.
* **Color semantics** (MVP): green=Completed; red=Overdue/Failed Check; transparent=others.
* **Drawers & modals**: consistent padding, fixed widths; ESC to close.
* **Buttons**: Primary = Create / Mark Done; Secondary = Upload; Destructive = Reject.

---

## 21) Definition of Done (MVP)

* All endpoints documented (OpenAPI).
* Role-based UI verified.
* Core flows (create project, upload & approve doc, mark milestone, automation fire) verified end‑to‑end in staging.
* Performance & accessibility checks passed.
* Onboarding guide and 5 sample templates included.
* No P0/P1 bugs open.

---

This PRD provides the functional scope, data structures, UX behavior, and acceptance criteria necessary to design and build the MVP. If you’d like, I can convert this into user stories with estimations or produce wireframes for the grid, summary drawer, and automation builder.
