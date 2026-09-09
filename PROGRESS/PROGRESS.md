# 1OS — Project Progress Log
**Platform:** 1OS by Simply Engineering Pte Ltd
**Pilot Tenant:** Astronic Services & Trading Pte Ltd
**Last Updated:** 2026-08-08

---

## Dev / Prod Quick Reference

| | Dev | Prod |
|---|---|---|
| **Code here** | `/home/lucus/1os-dev/` (`dev` branch) | `/opt/1os/` (`main` branch) |
| **Frontend** | Vite `:5173` (`1os-vite.service`) | Nginx (`1os-prod` site, `:8000` → `1os.astronic.com.sg`) → `/opt/1os/frontend/dist` |
| **Backend** | Django `:8001` (`--noreload`, `1os-django.service`) | Gunicorn `127.0.0.1:8002` (`gunicorn-1os.service`, 3 workers) |
| **DB** | PostgreSQL `astronic_dev` | PostgreSQL `astronic` — **separate DB, not shared** |
| **Restart** | `sudo systemctl restart 1os-django.service` | `sudo systemctl restart gunicorn-1os.service` |

> ✅ **Corrected 2026-07-30**: dev and prod use **separate databases** (`astronic_dev` vs `astronic`), not one shared `1os_db` as previously documented here — verified by comparing `DB_NAME` in each checkout's `.env`. Practical effect: a migration applied on one DB does **not** automatically apply to the other. This was caught because `0016_attendance_health_declared` was applied to `astronic_dev` but not to `astronic` — prod's `hr_attendance` table is missing that column, which would break every Attendance-touching endpoint (`clock_in`, `mine`, `team`, ...) the moment prod's Gunicorn is restarted/redeployed while running current `models.py`. **Any prod deploy must run `python manage.py migrate` against the prod DB before restarting `gunicorn-1os.service`.**
> Dev Django runs `--noreload`; it's systemd-managed (`1os-django.service`), so `kill`ing the process directly still works (systemd auto-restarts it) but `sudo systemctl restart 1os-django.service` is the correct way to reload after a backend edit.
> Per-server ports/hosts (Vite + `dev.py`/prod `ALLOWED_HOSTS`/CSRF) are env-driven via `.env` (per-checkout, gitignored — not committed/pull-safe, contrary to what this doc used to say).

**Deploy:** `scripts/backup_db.sh` → `git pull` in `/opt/1os` → `pip install` → `migrate` → `npm run build` → `collectstatic` → `sudo systemctl restart 1os.service`.
Always back up the DB before `migrate`. See `DEVELOPMENT.md` / `BACKUP.md` for full steps.

---

## What Was Built (Sessions 1–5, up to 2026-06-10)

### 1. Project Structure
Set up a clean Django monolith at `/opt/1os/` following the architecture defined in `1os-dev-guide.md`.

```
/opt/astronic/
├── project_config/     Django settings, root URLs
├── shared/             BaseModel, permissions, middleware, responses, utils
├── services/
│   ├── auth/           Tenant, User, PermissionGroup
│   ├── organisation/   Company, Department, Team, Position, Site
│   ├── hr/             Employee, Leave, Attendance, Certifications
│   ├── operations/     Jobs, WTS, Assets, Inspections
│   ├── finance/        Quotations, Invoices, Payments
│   ├── compliance/     Licences, Incidents
│   ├── notifications/  Notification
│   └── dashboard/      Overview stub
├── frontend/           React + Vite (not yet started)
└── gateway/            Nginx (not yet configured)
```

---

### 2. Database Models — 28 Models Migrated

| Service | Models |
|---|---|
| auth | Tenant, User, PermissionGroup |
| organisation | Company, Department, Team, Position, Site |
| hr | Employee, LeaveType, LeaveBalance, LeaveApplication, Attendance, Certification, PublicHoliday |
| operations | Job, WTSRequest, Asset, Inspection |
| finance | Quotation, QuotationItem, Invoice, InvoiceItem, Payment |
| compliance | Licence, Incident |
| notifications | Notification |

> **4 models added beyond the original schema** (gaps identified during review):
> `InvoiceItem`, `Payment`, `LeaveBalance`, `PublicHoliday`

---

### 3. API Endpoints — All Routed and Live

| Route | Service | Endpoints |
|---|---|---|
| `/api/auth/` | Auth | token, users, tenants, permission-groups |
| `/api/org/` | Organisation | companies, departments, teams, positions, sites |
| `/api/hr/` | HR | employees, leave-types, leave-balances, leave-applications, attendance, certifications, public-holidays |
| `/api/ops/` | Operations | jobs, wts, assets, inspections |
| `/api/finance/` | Finance | quotations, quotation-items, invoices, invoice-items, payments |
| `/api/compliance/` | Compliance | licences, incidents |
| `/api/notify/` | Notifications | notifications |
| `/api/dashboard/` | Dashboard | overview (stub) |

---

### 4. Tech Stack Configured

- **Auth:** JWT via `djangorestframework-simplejwt` (8h access / 7d refresh)
- **CORS:** `django-cors-headers` (allows `localhost:5173` for frontend dev)
- **Config:** `python-decouple` — all secrets via `.env` file
- **Pagination:** 20 records per page (standard across all endpoints)
- **Timezone:** Asia/Singapore
- **Custom User:** UUID-based, email login, role field (superadmin/admin/manager/staff/viewer)

---

### 5. React Frontend — Live

- React + Vite scaffold at `frontend/`
- Login page with JWT auth
- Dashboard with stat cards
- Sidebar: Dashboard, Projects, HR, Clock-In, Schedules, Calendar, Files
- Projects page: create/list projects, inline task groups + tasks
- Project detail: task photos, documents, PDF/Excel export, WhatsApp reminder button
- Project edit modal (manager+): all fields, supervisor (Foreman) + manager dropdowns
- Task deep-link: `?project={id}#task-{taskId}` auto-opens and scrolls to task
- HR module: Employees, Leave, Attendance, Courses, Approvals tabs (role-gated)
- Clock-In: photo + GPS + geofence (200m), watermark, FileBrowser upload
- Work Schedules: date picker, add/edit/delete schedules, CSV import/export
- Files page: embedded FileBrowser
- Module access control: per-user module list, sidebar + route gating
- 26 worker accounts created (`Astronic.7890`)

---

### 6. Production Deployment (June 2026)

- **Nginx** (`:8000`) serves `frontend/dist/` directly — no WhiteNoise
- **Gunicorn** (`:8002`, 3 workers) handles Django API only — managed by systemd (`gunicorn-1os`)
- **Cloudflare Tunnel:**
  - `ast1.sim-eng.com` → Nginx `:8000` (prod)
  - `ast2.sim-eng.com` → Vite `:8100` (dev)
  - `ssh.ast1.sim-eng.com` → SSH `:22`
  - `ast-iot.sim-eng.com` → IoT `:6123`
  - `files.sim-eng.com` → FileBrowser `:8088`
- **Separate prod folder:** `/home/lucus/1os-prod/` on `main` branch
- **Dev/prod isolation:** dev at `/opt/1os/` (`dev` branch), prod at `/home/lucus/1os-prod/` (`main` branch)
- **Nginx user:** `lucus` (set in `/etc/nginx/nginx.conf`) — avoids permission issues with home dir

---

### 7. Environment Summary

| Item | Dev | Prod |
|---|---|---|
| Path | `/home/lucus/1os-dev/` | `/opt/1os/` |
| Branch | `dev` | `main` |
| Frontend | Vite `:5173` (no dedicated domain found — accessed directly by host:5173) | Nginx `1os-prod` site → `1os.astronic.com.sg` (`:8000`, proxied) |
| Backend | Django `:8001` (`--noreload`) | Gunicorn `127.0.0.1:8002` (`gunicorn-1os.service`) |
| DB | PostgreSQL `astronic_dev` | PostgreSQL `astronic` — **separate DB** (corrected 2026-07-30; see note above) |
| Admin | `http://<host>:8001/admin/` (proxied via `:5173/admin`) | `https://1os.astronic.com.sg/admin/` |
| GitHub | `github.com/Limply/1os` (private) | ← same |

---

## What Was Built (Sessions 7+, 2026-06-12 → 2026-06-27)

> Platform generalised from the Astronic pilot to **1OS**; domains migrated to
> `1os.sim-eng.com` (prod) / `dev.sim-eng.com` (dev). Prod/dev folders swapped
> (prod now `/opt/1os`, dev now `/home/lucus/1os-dev`).

### Projects & Finance
- Project financial fields + bulk import of ~150 SE projects from AppSheet CSV
- Projects page: status filter tabs, sortable column headers, grouping & search,
  pagination disabled (returns all)
- **Operations page** (Jobs, WTS) and **Finance page** (Quotations, Invoices)
- **Quotation PDF** export; service report module + docs
- **Payments tracking (2026-06-27):** Payments page + `PaymentViewSet` that
  recomputes invoice `paid_amount`/`status`/`paid_date`, records `recorded_by`,
  and marks the linked project **completed** + appends to `payment_record` when
  fully paid. Finance signals keep Quotation `subtotal`/`gst_amount`/`total` in
  sync with line items on admin/API edits (preserves each quote's GST treatment).

### Org / Data model
- **Unified `Client` into `Organisation`** (data migration + dropped FK cols, irreversible) — deployed to prod
- **CRM module** scaffold (Client, Contact, Lead, Interaction)
- My Tools / My Personal pages

### RBAC & Supervisor mobile app
- **RBAC foundation**: new roles + permission guards across all services & frontend routes
- Supervisor mobile app: clock-in tab, task list, task detail page, daily manpower report,
  Projects accordion, desktop frame (max 480px centred)
- WSH Photo, Daily Reports, Reports tab, Problem Report flows

### HR & Dashboard
- **Monthly expense claims** with receipt attachments
- Company-wide **dashboard**: project status, manpower & financials, consolidated graphical KPI panels
- Colour theme settings (6 themes) with Save confirmation
- Unlisted `/mock_up_page` for live design previews

### DevOps / Config
- Per-server config (Vite port/proxy/hosts, `ALLOWED_HOSTS`/CSRF) driven from `.env` (pull-safe)
- **DB backup script** `scripts/backup_db.sh` + backup/restore docs (`BACKUP.md`)
- Migration numbering realigned so dev & prod histories stay compatible
- nginx `client_max_body_size 20M` (mobile photo upload fix)

### Planned / Approved (not yet built)
- **1OS ↔ NAS project-file integration** — plan approved 2026-06-26, see `NAS_INTEGRATION_PLAN.md`
  (1OS auto-creates/manages the NAS `Projects/` tree; prod tree → `/mnt/data/SE-Bizz/Projects`)

---

## What Was Built (Session 8, 2026-07-24)

> Edited directly on `main`/prod (`/opt/1os`) — frontend rebuilt and `gunicorn-1os.service`
> restarted after each backend/frontend change.

### Clock-In — schedule now optional
- Staff can clock in with no `WorkSchedule` row for the day — backend no longer 400s;
  geofence/late checks are simply skipped when there's no schedule to check against
  (`AttendanceViewSet.clock_in`, `services/hr/views.py`)
- Frontend Clock In button no longer disabled by `!schedule`; banner reworded to say
  clock-in still works (`ClockInWidget.jsx`)
- New standalone link **`/staff/clock-in`** for sharing directly with workers — same
  component as `/clock-in`, no sidebar/layout (`App.jsx`)

### Supervisor Clock-In bug — actually fixed
- `SUPERVISOR_CLOCKIN_BUG.md` (open since 2026-07-16) resolved: added self-service
  `/hr/employees/me/` (loosened `HRPermission` → `IsAuthenticated`), new
  `/hr/work-schedules/mine/`, new `/hr/attendance/mine/` — all scoped to the
  requesting user. `ClockInWidget.jsx` now calls these instead of the
  `HRPermission`-gated list endpoints, and surfaces fetch errors instead of the
  previous silent `.catch(() => {})`.
- This was verified against prod with a real Playwright run, logged in as a real
  account — GPS, photo, and Clock In/Out all completed end-to-end
  (`tests/e2e/clockin_test.py`, new — unlike `smoke_test.py` this one actually submits).

### Position-level tiering (new)
- `Position.level` set for the first time on real positions: Construction Worker=1,
  Foreman=2, Senior Supervisor=3, Manager=6 (was 3), Advisor=7 (was 6, moved to avoid
  colliding with Manager's new level 6 — Advisor and Business Development now share
  tier 7, which they already matched on permissions).
- `LEVEL_PERMISSIONS` (`shared/permissions.py`) redefined for levels 1/2/3/6/7/10.
- `SupervisorLayout.jsx` now gates supervisor-app tabs per tier instead of a binary
  level-1 check: Level 1 → Clock In only; Level 2 → Home/Projects/Clock In;
  Level 3+ → full nav (Home/Projects/Team/Clock In/Reports).
- Documented in `DEVELOPMENT.md` next to the Roles table — closes the doc gap
  `DOC_COMPLIANCE_REVIEW.md` flagged (`position_level` tiering was undocumented).

---

## What Was Built (Session 9, 2026-07-30)

> Edited on `/opt/1os` (prod checkout), merged with 5 unrelated commits that had
> landed on `origin/main` from elsewhere (NAS integration, calendar, Mindset Log,
> Business Strategy dashboard) — see "Merge with concurrent work" below. Each change
> verified via Playwright against dev, then rebuilt/migrated/restarted on prod.

### Clock-in: health declaration + office geofence
- New "I am feeling healthy today" checkbox — required before the camera unlocks for
  clock-in; watermarked onto the clock photo. New `Attendance.health_declared` field.
- Clock-in photo watermark's site line now shows the matched site name (schedule,
  office, or GPS address) instead of just the raw address.
- Schedule-less clock-in now checks GPS against **office locations** (see Locations,
  below) instead of skipping the geofence check entirely — if within radius, treated
  as a normal on-site clock-in; if not, falls back to the existing "select a project
  to clock in remotely" flow.

### New: HR > Team Attendance (manager tab)
- Daily view: summary tiles (Present/Late/Absent/On Leave) + full roster with
  clock in/out times, hours, and a clock-photo lightbox.
- Monthly view: per-employee attendance rate, late incidents, absences, total hours.
- Roster is filtered to positions that actually clock in via the supervisor app
  (`_requires_clock_in()`, based on `Position.level` → `LEVEL_PERMISSIONS` →
  `supervisor.app`) — office/desktop roles (Directors, Managers, Advisors, Business
  Development) are excluded rather than showing as permanently "pending"/"absent".
- No-show rule: after 9am (Singapore time) with no clock-in record, status shows
  "absent" instead of "pending" (`AttendanceViewSet.team`, `services/hr/views.py`).

### New: HR > Locations (manager tab) + Site model changes
- Full CRUD over the existing `organisation.Site` model (previously only reachable
  via Django admin, or buried as a picker in the Operations WSH report form): name,
  type, address, postal code, GPS lat/lng, geofence radius, contact info.
- `Site` gained `radius` (geofence radius in metres, new) and `project` (optional FK
  to `projects.Project`, new) fields.
- Add/Edit form has an optional "Project" picker that auto-fills name/address/GPS/
  contact from the selected project's `site_address`/`site_lat`/`site_lng`/
  `client_contact`/`client_phone` — still freely editable, and a location doesn't
  require a project.
- **"Import from Projects"** button: `POST /org/sites/import_from_projects/` creates/
  refreshes a Location for every active project that has an address or GPS set,
  skipping ones with neither. Idempotent (re-running updates, doesn't duplicate).
  Ran once on prod: **2 created** (real projects with site data), several dozen
  skipped (no site info on the project record).
- New self-service `GET /org/sites/office/` (`IsAuthenticated`, no HR/org module
  permission) returns active `type=office` sites — this is what the clock-in
  geofence check above actually reads, so the office address/radius is editable
  from this tab with no code deploy.
- Created a real **"Astronic Office"** Site record on both dev and prod
  (1.3772153, 103.8707002, 300m radius) — previously this only existed as a
  hardcoded constant in `ClockInWidget.jsx`, now it's real, editable data.

### Merge with concurrent work
- `origin/main` had moved 5 commits ahead (NAS project-folder integration, project
  task calendar, Mindset Log feature, Business Strategy/Quotation dashboard) from
  work done elsewhere, with a real edit conflict in `services/hr/views.py` against
  this session's clock-in changes. Merged cleanly (git auto-resolved, no overlapping
  lines) but surfaced a **migration graph conflict**: two `hr` app migrations
  (`0016_attendance_health_declared` vs `0016_mindsetanchor_mindsetlog`) both forked
  off `0015`. Resolved with `0018_merge_20260730_1224.py` — this file was initially
  missed in the commit (applied to both DBs but not committed) and had to be pushed
  in a follow-up fix.
- `/home/lucus/1os-dev` (the actual dev checkout) turned out to be **behind** the
  commits that landed on `origin/main` — whoever pushed them did so from elsewhere,
  not that checkout. It still has its own separate uncommitted work (`REFERENCE/`,
  `ProjectFilesModal.jsx`, `services/calendar/`, `migrate_test_batch.py`) that
  doesn't match what's now on `origin/dev`/prod. **Not reconciled — needs a
  conversation with whoever owns that work before it's touched further.**

### Doc corrections
- Dev and prod use **separate databases** (`astronic_dev` vs `astronic`), not one
  shared `1os_db` as this doc previously claimed — see the Dev/Prod Quick Reference
  section above. Caught because a migration had been applied to dev but not prod.
- Ports/services/domains in the Quick Reference table were also stale (old
  `sim-eng.com` naming, wrong ports) — corrected to match the actual running
  systemd units (`1os-django`, `1os-vite`, `gunicorn-1os`) and nginx config.

### Known test-data cleanup needed (before showing this to non-technical stakeholders)
- Repeated E2E test runs against **prod** today, logged in as `lucus@astronic.com.sg`,
  left a real `Attendance` row for 2026-07-30 with `clock_in` *after* `clock_out`
  (artifact of running Clock In then Clock Out tests multiple times back-to-back).
  Team Attendance's daily view for today will show this — worth deleting/fixing
  that row, or clocking in/out cleanly once, before demoing.
- "Import from Projects" pulled in a project literally named **"Testing Project"**
  as a real Location (it had `site_address`/GPS set). Worth deleting or renaming
  before the Locations list is shown around.

---

## What Was Built (Session 10, 2026-08-08)

> Project **detail** page reworked into a spreadsheet-style grid plus a Gantt view.
> Built and proven on **1Farm** first, then ported to 1OS — `ProjectDetail.jsx` had
> never diverged between the two, so the port was a straight file copy, not a merge.
> Both apps now carry near-identical `ProjectDetail.jsx` / `TaskGantt.jsx` (1OS keeps
> `const foremen = users` from Session 9); keep them in step so future ports stay easy.

### Project Detail — sheet view
- Task list rebuilt from stacked per-group cards into **one spreadsheet grid** for the
  whole project: columns `# / status / Task / Assigned / Start / End / Wt / Priority / actions`,
  group names as full-width band rows so columns line up across every group
- **~22px rows** (`text-xs`/`text-[11px]`, `px-1.5 py-0.5`), full grid lines, square
  corners, sticky header, horizontal scroll under 880px. Tasks went from 2 lines to 1
- **In-cell editing** — clicking a task/assignee/date/weight turns that column's cell
  into an input in place. Enter saves from any cell in the row, Esc cancels
- **Add-task is a row**, typed into the same columns, not a separate form below the group
- **Esc backs out of anything open**, innermost first: template picker → edit-project
  modal (suppressed mid-save) → row edit → add-task row → add-group form → comment panels
- **Drag-resizable columns**; double-click a handle resets one column, `⇔ Reset cols`
  (appears only once widths are customised) resets all. Widths persist in `localStorage`

### Project Detail — Gantt view
- `≡ Sheet` / `▤ Gantt` toggle in the page header; choice persists per browser
- New `frontend/src/components/TaskGantt.jsx` — frozen 250px task pane, scrolling
  timeline, two-tier header (month band over day/week columns), weekend shading,
  today line, per-group rollup bars, status-coloured bars with legend
- **Day / Week / Month** zoom + `Today` button; auto-centres on today on open
- **Schedule from the chart** (managers only, `PROJECTS_EDIT`): drag the `⠿` handle
  next to an unscheduled task onto the timeline, or drag across its empty track to draw
  the span; drag a bar to move it, its edges to resize; `✕` clears dates; **Esc aborts
  an in-flight drag**. Failures show as inline red text, never swallowed
- Built this way because **no task in either DB had any dates** — a read-only Gantt
  would have rendered empty. Scheduling is the first thing you do in it

### ⚠️ `due_date` stays in sync with `end_date`
The sheet's add-task row originally wrote only `due_date`; it now writes
`start_date` + `end_date` so the Gantt has something to draw. **`due_date` is still
written, mirroring `end_date`**, at every write site (`handleAddTask`, `saveEditing`,
Gantt drag + clear). Do not "clean this up" — `due_date` is what drives:

| Consumer | Query |
|---|---|
| `Calendar.jsx` | `t.due_date` → event date; no `due_date` ⇒ task falls into "unscheduled" |
| `services/dashboard/views.py` | `due_date__lt=today`, `due_date__lte=today+7` (overdue / due this week) |
| `services/notifications/views.py` | `due_date__in=[today, soon]` (due-soon alerts) |

Frontend-only session — no models, no migrations, no `collectstatic`. On the **SE
server** nginx serves `frontend/dist` directly for both 1OS and 1Farm, so shipping
this change alone is `npm run build` with **no** service restart.

> **On the SE server, prod was found 7 commits behind `origin/main`** during this
> session (`/opt/1os` at `dbccf23`, main at `565c260`) — all of Sessions 8–9
> (clock-in, health declaration, Team Attendance, Locations) is committed but **not
> deployed there**, and it carries `hr` + `organisation` migrations. Bringing that
> checkout up to date is therefore *not* a plain `npm run build`: back up the DB →
> `git pull` → `pip install` → `migrate` → build → `collectstatic` → restart.
> **Not done in this session** — only the two files above were placed on `/opt/1os`
> and rebuilt.

> **Note on this doc's Quick Reference (top of file):** the table and the 2026-07-30
> correction describe the **Astronic server** (`:5173`/`:8001`/`:8002`,
> `1os.astronic.com.sg`, `astronic_dev` vs `astronic`). The **SE server** is a
> different deployment: `dev.sim-eng.com` → Vite `:6100` → Django `:6001`, prod
> `1os.service` on `:6000`, nginx site `1os`. Ports/DB names are per-checkout `.env`.
> Check which machine you're on before following the Quick Reference.

---

## What's Next (Priority Order)

### Frontend
- [x] Operations page (Jobs, WTS)
- [x] Finance page (Quotations, Invoices, Payments)
- [ ] Compliance page (Licences, Incidents)
- [ ] HR Calendar (leave, public holidays) — uses `CalendarView`
- [ ] Ops Calendar (jobs, site visits) — uses `CalendarView`
- [ ] Notifications / Telegram bot integration

### Backend — Business Logic
- [ ] Leave approval workflow (pending → approved/rejected)
- [ ] Leave balance deduction on approval
- [ ] Job status transitions + auto-numbering (Operations)
- [ ] WTS GPS live tracking
- [ ] Quotation → Invoice conversion (Finance)
- [x] GST auto-calculation on save (9%) — via finance signals (2026-06-27)
- [ ] Licence expiry alerts (Compliance)
- [x] Dashboard aggregate endpoint (active jobs, pending approvals, revenue MTD)

### Next-up / In flight
- [ ] 1OS ↔ NAS project-file integration (plan approved — `NAS_INTEGRATION_PLAN.md`)

### Backend — Quality
- [ ] Write API contracts per service (`api-contract.yml`)
- [ ] Add filtering, search, ordering to all ViewSets
- [ ] Write tests (minimum 1 happy + 1 error per endpoint)

### DevOps
- [ ] Docker / docker-compose for easier multi-machine deployment (deferred — see DEVELOPMENT.md for decision)

---

## Known Issues / Decisions Pending

| Issue | Status |
|---|---|
| **[FIXED 2026-06-16] Photo upload fails on mobile browser** | nginx default `client_max_body_size` is 1MB; mobile camera photos are 3–8MB. Fix: added `client_max_body_size 20M;` to `/etc/nginx/sites-available/1os-prod` on the server. Desktop worked because gallery picks are smaller. |
| **[CORRECTED 2026-07-30] Dev/prod DB separation** | Previously documented as sharing one `1os_db` — **not true**. Dev uses `astronic_dev`, prod uses `astronic`, confirmed via each checkout's `.env`. Consequence: migrations don't propagate between them automatically. Discovered because `0016_attendance_health_declared` was applied to dev but not prod — prod's `hr_attendance` table is missing the column, a live landmine for the next prod deploy/restart until `migrate` is run there. |
| Project detail `localStorage` keys are named `farm.*` | Cosmetic. `farm.projectDetail.colWidths` / `.view` / `farm.gantt.unit` originated in 1Farm. No collision — `sim-eng.com` and `farm.sim-eng.com` have separate `localStorage`. Left as-is to keep the file in step with 1Farm for future ports |
| **SE server prod is behind `origin/main`** | `/opt/1os` (SE server) was at `dbccf23` on 2026-08-08 while main was at `565c260` (Sessions 8–9 undeployed there, incl. `hr`/`organisation` migrations). Needs the full backup→pull→pip→migrate→build→collectstatic→restart run |
| Quick Reference at top of this doc is Astronic-server-specific | Ports/domains/DBs there (`:5173`/`:8001`/`:8002`, `1os.astronic.com.sg`) do not match the SE server (`:6100`/`:6001`/`:6000`, `sim-eng.com`). Per-checkout `.env` decides. Doc should be split per server |
| `services/core/` exists but has no purpose | Unused — can be deleted |
| Django Admin has no models registered | Needs `admin.py` wiring |
| Compliance module has no assigned dev | Needs owner assignment |
| Dashboard reads across services — architecture not decided | Pending |
| No Payroll, Recruitment, or Performance models yet | Not in schema v1, deferred to v0.3+ |
| **[FIXED 2026-07-24] Supervisor Clock-In broken for Level-1 workers** (found 2026-07-16, role-play QA) | `Employee`/`WorkSchedule` reads needed by the clock-in flow were gated by `HRPermission` instead of the lighter `IsClockInAllowed` used on the actual clock-in/out actions. Fix: self-service `employees/me/`, `work-schedules/mine/`, `attendance/mine/` endpoints under `IsAuthenticated`. See `SUPERVISOR_CLOCKIN_BUG.md`. Also newly relevant: `Position.level` is now actually set on real positions (1/2/3/6/7/10) — this bug was previously dormant since no real position used level 1. |
| Doc-vs-code compliance review (2026-07-16) found `crm.Client` doesn't exist (contradicts this doc's own data-model note) and the Error Display Rule is violated in 11 frontend files | See `DOC_COMPLIANCE_REVIEW.md` for full findings + priority order |

---

*1OS by Simply Engineering Pte Ltd — Internal Progress Reference*
