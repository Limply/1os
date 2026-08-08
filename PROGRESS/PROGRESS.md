# 1OS — Project Progress Log
**Platform:** 1OS by Simply Engineering Pte Ltd
**Pilot Tenant:** Astronic Services & Trading Pte Ltd
**Last Updated:** 2026-08-08

---

## Dev / Prod Quick Reference

| | Dev | Prod |
|---|---|---|
| **Code here** | `/home/lucus/1os-dev/` (`dev` branch) | `/opt/1os/` (`main` branch) |
| **Frontend** | Vite `:6100` → `dev.sim-eng.com` | Nginx → `1os.sim-eng.com` |
| **Backend** | Django `:6001` (`--noreload`) | Gunicorn `:6000` (`1os.service`, 3 workers) |
| **DB** | PostgreSQL `1os_db` (shared) | ← same `1os_db` (dev edits live prod data) |
| **Restart** | `sudo systemctl restart 1os-dev-django.service` | `sudo systemctl restart 1os.service` |

> ⚠️ Dev and prod **share the same `1os_db`** — editing on `dev.sim-eng.com` mutates live data.
> Dev Django runs `--noreload`; **restart `1os-dev-django.service` after any backend edit** or it serves stale code.
> Per-server ports/hosts (Vite + `dev.py`/prod `ALLOWED_HOSTS`/CSRF) are now **env-driven via `.env`** (committed, pull-safe).

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
| Frontend | Vite `:6100` → `dev.sim-eng.com` | Nginx → `1os.sim-eng.com` |
| Backend | Django `:6001` (`--noreload`) | Gunicorn `:6000` (`1os.service`) |
| DB | PostgreSQL `1os_db` (shared) | ← same `1os_db` |
| Admin | `https://dev.sim-eng.com/admin/` | `https://1os.sim-eng.com/admin/` |
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

## What Was Built (Session 8, 2026-08-08)

> Project **detail** page reworked into a spreadsheet-style grid plus a Gantt view.
> Built and proven on 1Farm first, then ported to 1OS — `ProjectDetail.jsx` had
> never diverged between the two, so the port was a straight file copy, not a merge.
> Both apps now carry byte-identical `ProjectDetail.jsx` / `TaskGantt.jsx`; keep it
> that way so future ports stay a copy.

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

Frontend-only session — no models, no migrations, no `collectstatic`. nginx serves
`frontend/dist` directly on both apps, so deploying is `npm run build` with **no**
service restart.

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
| Dev/prod share one `1os_db` | By design, but dev edits hit live data — be careful on `dev.sim-eng.com` |
| Project detail `localStorage` keys are named `farm.*` | Cosmetic. `farm.projectDetail.colWidths` / `.view` / `farm.gantt.unit` originated in 1Farm. No collision — `sim-eng.com` and `farm.sim-eng.com` have separate `localStorage`. Left as-is to keep the file byte-identical with 1Farm for future ports |
| `services/core/` exists but has no purpose | Unused — can be deleted |
| Django Admin has no models registered | Needs `admin.py` wiring |
| Compliance module has no assigned dev | Needs owner assignment |
| Dashboard reads across services — architecture not decided | Pending |
| No Payroll, Recruitment, or Performance models yet | Not in schema v1, deferred to v0.3+ |

---

*1OS by Simply Engineering Pte Ltd — Internal Progress Reference*
