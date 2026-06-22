# 1OS — Development Tracker
**Platform:** 1OS by Simply Engineering Pte Ltd
**Pilot Tenant:** Astronic Services & Trading Pte Ltd
**Last Updated:** 2026-06-13

---

## Environments
| | Dev | Prod |
|---|---|---|
| **Path** | `/home/lucus/1os-dev/` | `/opt/1os/` |
| **Branch** | `dev` | `main` |
| **Frontend** | Vite `:6100` (hot reload, proxies API to :6001) | Nginx `:80` serves `frontend/dist/` |
| **Backend** | Django `runserver :6001` | Gunicorn `:8000` (internal, Nginx proxies) |
| **Public URL** | `https://dev.sim-eng.com` | `https://se-1os.sim-eng.com` |
| **Start** | `./start_dev.sh` | systemd manages Nginx + Gunicorn |

> **Always code in `/home/lucus/1os-dev/`** — never edit `/opt/1os/` directly.

### Port Map
| Port | Process | Purpose |
|---|---|---|
| `:80` | Nginx (prod) | Public — `se-1os.sim-eng.com` via Cloudflare |
| `:6001` | Django `runserver` (dev) | Internal — dev API backend |
| `:6100` | Vite (dev) | Public — `dev.sim-eng.com` via Cloudflare |
| `:8000` | Gunicorn (prod) | Internal — prod API, Nginx proxies here |
| `:8080` | FileBrowser | Public — `se-files.sim-eng.com` via Cloudflare |

### Cloudflare Tunnel
| Hostname | Target |
|---|---|
| `se-1os.sim-eng.com` | `localhost:80` (prod Nginx) |
| `dev.sim-eng.com` | `localhost:6100` (dev Vite) |
| `se-files.sim-eng.com` | `localhost:8080` (FileBrowser) |
| `ssh.sim-eng.com` | `localhost:22` |
| `ssh-se1.sim-eng.com` | `localhost:22` |

### Daily Dev Flow
```bash
cd /home/lucus/1os-dev
./start_dev.sh          # starts Django :6001 + Vite :6100

# make changes, Vite hot-reloads instantly
git add <files>
git commit -m "feat: ..."
git push origin dev
```

### Deploy to Production
```bash
# 1. Merge dev → main and push
git checkout main && git merge dev && git push origin main

# 2. Pull in prod folder
cd /opt/1os && git pull origin main

# 3. Rebuild frontend
cd frontend && npm run build && cd ..

# 4. Migrate + collect static
source venv/bin/activate
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# 5. Restart Gunicorn
sudo systemctl restart gunicorn-1os
```

### systemd Services
| Service | Command |
|---|---|
| `gunicorn-1os` | `sudo systemctl restart gunicorn-1os` |
| `nginx` | `sudo systemctl restart nginx` |
| `cloudflared` | `sudo systemctl restart cloudflared` |

---

## Architecture
### Stack
| Layer | Dev | Prod |
|---|---|---|
| Web server | — | Nginx (static files + proxies `/api/`, `/admin/`) |
| App server | Django `runserver` | Gunicorn (3 workers) |
| Frontend | Vite HMR | Nginx serves `frontend/dist/` |
| Admin static | Django staticfiles | Nginx serves `staticfiles/` at `/static/` |
| Process mgmt | `start_dev.sh` | systemd |
| DB | PostgreSQL `astronic` (shared dev/prod) | ← same |
| Auth | JWT — 8h access / 7d refresh (simplejwt) | ← same |

### Decoupling Rule (Primary Rule)

Services are fully independent. A change in one module must never break another.

| Rule | Detail |
|---|---|
| No cross-service imports | Services never import models or functions from each other |
| API-only communication | Services talk via HTTP, not direct DB queries |
| Shared layer only | Only `shared/` (BaseModel, middleware) and `accounts.User` may be referenced across services |
| Loose linking | Cross-module references use `ref_type` + `ref_id` (not FK) |
| Independent migrations | Each service manages its own migrations |
| Frontend mirrors this | Each page only calls its own service API endpoints |

> **Exception:** `services/dashboard/views.py` imports from projects, hr, crm — intentional; dashboard is an aggregate read-only view.

### Tenant Architecture — KIV Multi-Tenant

Current state: **single tenant per server** (one Astronic installation). `BaseModel` has `tenant` FK and `TenantMiddleware` sets `request.tenant` from JWT — the plumbing is ready but there is only one `Tenant` record per deployment.

Multi-tenant (multiple clients on one server) is **deferred** pending business need. Trigger: 5+ paying tenants.

See ADR at bottom of this file for full analysis.

### Directory Tree (actual)
```
/home/lucus/1os-dev/
├── project_config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── dev.py
│   │   └── prod.py
│   └── urls.py
├── shared/
│   ├── models.py          # BaseModel (UUID pk, tenant FK, timestamps, is_active)
│   ├── middleware.py       # TenantMiddleware + DynamicCORSMiddleware
│   ├── storage.py         # FileBrowserStorage
│   └── admin.py
├── services/
│   ├── auth/              # Tenant, User, PermissionGroup
│   ├── organisation/      # Company, Department, Team, Position, Site,
│   │                      # Client (billing/company record for finance linking)
│   ├── hr/                # Employee, LeaveType, LeaveBalance, LeaveApplication,
│   │                      # Attendance, Certification, WorkSchedule, StaffDeployment,
│   │                      # PublicHoliday, ManpowerSettings
│   ├── projects/          # Project (auto project_no), Task, TaskPhoto, TaskDocument, TaskComment
│   ├── finance/           # Quotation+items, Invoice+items, DeliveryOrder+items, Payment
│   │                      # (all with auto-numbered doc IDs: Q-26-001, INV-26-001, DO-26-001)
│   ├── crm/               # Client (CRM record: type, leads, contacts), Contact, Lead, Interaction
│   │                      # Note: org.Client ≠ crm.Client — org.Client is for finance/quotation
│   │                      # linking; crm.Client is the full sales-pipeline record
│   ├── operations/        # Job, WTSRequest, Asset, Inspection
│   ├── compliance/        # Licence, Incident
│   ├── notifications/     # Notification (in_app, email, telegram, sms)
│   │                      # in-app works: bell polls /notify/generate/ every 60s,
│   │                      # auto-creates for task_due_soon, lead_followup_overdue, leave_pending
│   └── dashboard/         # overview endpoint (aggregate — intentional cross-service read)
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── auth.js
│   │   │   └── axios.js
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── CalendarView.jsx       # shared FullCalendar wrapper
│   │   │   ├── ManpowerCalendar.jsx
│   │   │   ├── ManpowerSettings.jsx
│   │   │   ├── ClockInWidget.jsx
│   │   │   ├── NotificationBell.jsx
│   │   │   ├── TaskPhotoModal.jsx
│   │   │   ├── TaskDocumentModal.jsx
│   │   │   ├── StatCard.jsx
│   │   │   └── AuthImage.jsx
│   │   ├── context/
│   │   │   └── ThemeContext.jsx
│   │   ├── hooks/
│   │   │   └── useManpowerSettings.js
│   │   ├── pages/
│   │   │   ├── Login.jsx              ✅
│   │   │   ├── Dashboard.jsx          ✅ KPI stats from /api/dashboard/
│   │   │   ├── Personal.jsx           ✅ My tasks, calendar, leave (/my)
│   │   │   ├── Projects.jsx           ✅ List, groups, search, sort, status tabs
│   │   │   ├── ProjectDetail.jsx      ✅ Tasks, photos, docs, PDF/Excel export
│   │   │   ├── Calendar.jsx           ✅ Projects calendar (dept filter, bars, dots)
│   │   │   ├── HR.jsx                 ✅ Employees, Leave, Attendance, Courses, Approvals
│   │   │   ├── ClockIn.jsx            ✅ Photo + GPS + geofence (200m)
│   │   │   ├── Schedules.jsx          ✅ Work schedules, CSV import/export
│   │   │   ├── OrgChart.jsx           ✅
│   │   │   ├── CRM.jsx                ✅ Clients, Contacts, Leads, Interactions
│   │   │   ├── Finance.jsx            ✅ Quotations, Invoices, Delivery Orders
│   │   │   ├── Files.jsx              ✅ Embedded FileBrowser
│   │   │   ├── Settings.jsx           ✅ Colour themes (6 themes)
│   │   │   ├── Operations → Placeholder  ❌ not built
│   │   │   ├── Compliance → Placeholder  ❌ not built
│   │   │   └── CameraTest.jsx         🔧 dev tool only
│   │   └── utils/
│   │       └── roleFilters.js
│   └── package.json
├── .env                   # secrets — never commit
├── .env.template
├── manage.py
├── requirements.txt
├── start_dev.sh
└── start_prod.sh
```

### API Routes

| Route | Service |
|---|---|
| `/api/auth/` | Tenant, User, PermissionGroup, JWT tokens |
| `/api/org/` | Company, Department, Team, Position, Site, Client |
| `/api/hr/` | Employee, LeaveType, LeaveBalance, LeaveApplication, Attendance, Certification, WorkSchedule, StaffDeployment, ManpowerSettings, PublicHoliday |
| `/api/projects/` | Project, Task, TaskPhoto, TaskDocument, TaskComment + task templates |
| `/api/finance/` | Quotation + items, Invoice + items, DeliveryOrder + items, Payment |
| `/api/crm/` | Client, Contact, Lead, Interaction |
| `/api/ops/` | Job, WTSRequest, Asset, Inspection |
| `/api/compliance/` | Licence, Incident |
| `/api/notify/` | Notification |
| `/api/dashboard/` | Aggregate overview (live) |
| `/api/files/proxy/` | FileBrowser proxy |

---

## Coding Rules

### Django
- `perform_create` always sets `tenant=request.tenant`
- Admin uses `TenantModelAdmin` to auto-set tenant on save
- Settings split: `base.py` / `dev.py` / `prod.py`, secrets in `.env`
- Never hardcode tenant, credentials, or environment values

### Field Naming Convention
| Type | Rule | Example |
|---|---|---|
| ForeignKey | Model name in snake_case — **no `_id` suffix** (Django adds `_id` to DB column automatically) | `quotation`, `invoice`, `project`, `task`, `site` |
| User/person FK | Role-based name | `prepared_by`, `assigned_to`, `uploaded_by`, `author`, `supervisor` |
| Loose string ref | Descriptive with `_no` or `_name` suffix | `project_no`, `client_name`, `invoice_no`, `do_no` |
| Status | Always just `status` | `status` |
| Dates | `_date` suffix | `issue_date`, `due_date`, `join_date`, `start_date` |
| Amounts | Descriptive | `subtotal`, `gst_amount`, `total`, `unit_price`, `paid_amount` |

> **Note:** The planned schema table uses `quotation_id`, `invoice_id`, `employee_id` etc. — these are conceptual FK references only. Actual field names in code never use the `_id` suffix.

### Calendar Architecture
- `components/CalendarView.jsx` — shared FullCalendar UI wrapper, accepts `events[]` prop only
- Each module owns its own calendar page (data fetching, filters, modals)
- Never put business data or API calls inside `CalendarView`

### Code Style
- No comments unless the WHY is non-obvious
- No error handling for things that can't happen
- No abstractions beyond what the task needs
- Commit after every completed feature

### Error Display Rule (Frontend)
Every save / submit action **must** surface errors to the user — never use a silent `.catch(() => {})`.

Pattern for any form that POSTs or PATCHes:
```jsx
const [error, setError] = useState('')

function handleSave() {
  setError('')
  api.post('/some/endpoint/', payload)
    .then(r => { /* success */ })
    .catch(err => {
      const msg = err.response?.data?.detail || err.response?.statusText || err.message || 'Failed to save'
      setError(msg)
    })
}

// In JSX, just above the action buttons:
{error && <p className="text-xs text-red-500">{error}</p>}
```

- `setError('')` on each new attempt (clears previous error)
- Clear error on Cancel too: `onClick={() => { setShowForm(false); setError('') }}`
- Do **not** use `alert()` or `console.error()` — inline red text only

### Git
- All code changes on `dev` branch — merge to `main` only when tested
- Never edit `/opt/1os/` directly
- Never force push to `main`
- Push to `github.com/Limply/1os` (private)

---

## Data Model Relationships

Cross-module links use loose string references (not FKs) to keep services decoupled. Within-module links use proper FKs.

| Group | Model | Links to | Field | How (Planned) | Status |
|---|---|---|---|---|---|
| **CRM** | Lead | Finance · Quotation | `client_name` | string copy on convert | ✗ CRM module not yet built |
| **CRM** | Client | Project · Project | `client_name` | string copy | ✗ CRM module not yet built |
| **Finance** | Quotation | QuotationItem | `quotation` | FK | ✓ |
| **Finance** | Quotation | Invoice | `quotation` | FK optional | ✓ `Invoice.quotation` |
| **Finance** | Quotation | DeliveryOrder | `quotation` | FK optional | ✓ `DO.quotation` |
| **Finance** | Quotation | Payment | `quotation` | FK optional | ✗ Payment links to Invoice only |
| **Finance** | Invoice | InvoiceItem | `invoice` | FK | ✓ |
| **Finance** | Invoice | DeliveryOrder | `invoice` | FK optional | ✓ `DO.invoice` |
| **Finance** | Invoice | Payment | `invoice` | FK optional | ✓ |
| **Finance** | Quotation | Project | `project_no` | string loose | ✓ |
| **Finance** | Invoice | Project | `project_no` | string loose | ✗ Missing `project_no` on Invoice |
| **Finance** | DeliveryOrder | Project | `project_no` | string loose | ✗ Missing `project_no` on DO |
| **Finance** | Expense | Project | `project_no` | string loose | ✗ Expense model does not exist |
| **Finance** | Payment | Project | `project_no` | string loose | ✗ Missing `project_no` on Payment |
| **Project** | Project | Task | `project` | FK | ✓ |
| **Project** | Project | Job | `project` | FK | ✗ Job is in `operations`, no Project FK |
| **Project** | Project | Asset | `project` | FK optional | ✗ Asset is in `operations`, no Project FK |
| **Project** | Project | Inspection | `project` | FK optional | ✗ Inspection links to Job, not Project |
| **Project** | Task | TaskPhoto | `task` | FK | ✓ |
| **Project** | Task | TaskDocument | `task` | FK | ✓ |
| **Project** | Task | TaskComment | `task` | FK | ✓ |
| **Manpower** | Employee | Leave | `employee` | FK | ✓ `LeaveApplication` |
| **Manpower** | Employee | Clock-in | `employee` | FK | ✓ `Attendance` |
| **Manpower** | Employee | Schedule | `employee` | FK | ✓ `WorkSchedule` |
| **Manpower** | Employee | Deployment | `employee` | FK | ✗ No Deployment model |
| **Manpower** | Employee | Levy | `employee` | FK | ✗ No Levy model |
| **Manpower** | Employee | Project Job | `employee` | FK (assigned) | ✗ No Employee→Job link |
| **Admin** | Site | Project | `site` | FK optional | ✗ Project has no `site` FK |
| **Admin** | Site | Quotation | `site` | FK optional | ✓ `Quotation.site` |
| **Admin** | Department | Employee | `department` | FK | ✓ |
| **Admin** | Organisation | Employee | `company` | FK | ✗ Employee has no `company` FK |

### Gap Summary
| Area | New Models Needed | Field/Link Additions |
|---|---|---|
| CRM | Lead, Client (entire module) | — |
| Finance | Expense | `project_no` on Invoice, DO, Payment; `quotation` FK on Payment |
| Project | — | Job/Asset/Inspection need `project` FK (currently in `operations`) |
| Manpower | Deployment, Levy | Employee→Job assignment link |
| Admin | — | `site` FK on Project; `company` FK on Employee |

---

## Tasks

### Backend
- [x] Tenant model (single per server, KIV multi-tenant)
- [x] User model — UUID pk, email login, role field (superadmin/admin/manager/staff/viewer)
- [x] PermissionGroup model
- [x] Organisation models — Company, Department, Team, Position, Site, Client
- [x] HR models — Employee, LeaveType, LeaveBalance, LeaveApplication, Attendance, Certification, WorkSchedule, StaffDeployment, ManpowerSettings, PublicHoliday
- [x] Projects models — Project (auto project_no), Task, TaskPhoto, TaskDocument, TaskComment
- [x] Finance models — Quotation + items, Invoice + items, DeliveryOrder + items, Payment (auto numbering on all)
- [x] CRM models — Client, Contact, Lead, Interaction
- [x] Operations models — Job, WTSRequest, Asset, Inspection
- [x] Compliance models — Licence, Incident
- [x] Notifications model — Notification (in_app, email, telegram, sms channels)
- [x] All API routes registered and live
- [x] JWT auth — 8h access / 7d refresh
- [x] TenantMiddleware — reads JWT, sets `request.tenant`
- [x] DynamicCORSMiddleware — reads `Tenant.site_url` for allowed origins
- [x] Django Admin — all models registered
- [x] Split settings — `base.py` / `dev.py` / `prod.py`
- [x] Dashboard aggregate endpoint — active projects, overdue tasks, staff on leave, CRM leads
- [x] 150 SE projects imported from AppSheet CSV
- [ ] Leave approval workflow — pending → approved/rejected, deduct balance, notify
- [ ] Job status transitions — draft → assigned → in_progress → completed, auto job_no
- [ ] WTS GPS live tracking — update `current_lat`, `current_lng`
- [ ] Quotation → Invoice conversion endpoint
- [ ] GST auto-calculation on save (9%)
- [ ] Licence expiry alerts — 30/14/7 day triggers
- [x] In-app notifications — bell polls `/notify/generate/` every 60s; auto-creates for task_due_soon, lead_followup_overdue, leave_pending; mark-read and mark-all-read endpoints live
- [ ] Notification delivery — Telegram bot + SMTP email (models + in_app done; email/telegram sending not wired)
- [ ] Add filtering, search, ordering to all ViewSets
- [ ] Tests — minimum 1 happy + 1 error per endpoint
- [ ] Standardise responses — `{success, data, message, errors}`
- [x] Delete `services/core/` — empty, unused

### Frontend
- [x] React + Vite scaffold, JWT auth flow, token refresh, logout
- [x] Sidebar — per-user module gating (modules JSONField)
- [x] Dashboard — stat cards from `/api/dashboard/`, ending-soon + overdue lists
- [x] Projects — list, grouping, search, status filter tabs, sortable columns
- [x] ProjectDetail — task groups, task CRUD, photos, docs, PDF/Excel export, WhatsApp reminder, deep-link `?project={id}#task-{taskId}`
- [x] Calendar — Projects calendar (dept filter, project bars, task dots, unscheduled summary)
- [x] HR — Employees, Leave, Attendance, Courses, Approvals (role-gated tabs)
- [x] Clock-In — photo + GPS + geofence (200m), watermark, FileBrowser upload
- [x] Schedules — date picker, add/edit/delete, CSV import/export
- [x] CRM — client list, contacts, leads pipeline, interaction log
- [x] Finance — Quotations, Invoices, Delivery Orders (tabs, create/edit/line items, GST calc)
- [x] Personal (`/my`) — my tasks, leave calendar, quick actions
- [x] OrgChart
- [x] Files — embedded FileBrowser
- [x] Settings — 6 colour themes, save confirmation
- [x] 26 worker accounts created (password `Astronic.7890`)
- [ ] Operations page — Jobs list, WTS tracker
- [ ] Compliance page — Licences, Incidents
- [ ] HR Calendar — leave + public holidays (uses `CalendarView`)
- [ ] Ops Calendar — jobs, site visits (uses `CalendarView`)
- [ ] Notifications page / inbox

### DevOps
- [x] Nginx + Gunicorn prod setup
- [x] systemd services — `gunicorn-1os`, `nginx`, `cloudflared`
- [x] Cloudflare Tunnel — `se-1os.sim-eng.com` (prod), `dev.sim-eng.com` (dev), `files`, `ssh`
- [x] GitHub repo — `github.com/Limply/1os` (private)
- [x] Split dev/prod environments with separate paths and branches
- [ ] Docker / docker-compose — deferred (see ADR below)

---

## Known Issues
| # | Issue | Priority |
|---|---|---|
| 1 | DB name `astronic` is shared between dev and prod — a dev migration could break prod | 🟡 Consider separate dev DB |
| 2 | Two `Client` models: `organisation.Client` (billing record, used by Finance) and `crm.Client` (sales pipeline). Different fields, different purpose — no merge needed, but confusing naming | 🟢 Low — document clearly |
| 3 | `SessionAuthentication` must NOT be in `DEFAULT_AUTHENTICATION_CLASSES` — if a Django admin session cookie exists in the browser, DRF enforces CSRF on all POST/PATCH/DELETE, causing 403. JWT-only auth in both dev and prod. Fixed June 2026. | 🔴 Do not re-add |

---

## Environment Reference

| Item | Value |
|---|---|
| Dev URL | `https://dev.sim-eng.com` or `http://192.168.1.27:6100` |
| Prod URL | `https://se-1os.sim-eng.com` |
| Dev backend | `http://192.168.1.27:6001` |
| Prod backend | `http://192.168.1.27:8000` (internal, Nginx proxies) |
| FileBrowser | `https://se-files.sim-eng.com` → `:8080` |
| Django Admin | `https://se-1os.sim-eng.com/admin/` |
| Admin user | `admin@astronic.com.sg` / `Astronic.2468` |
| DB | PostgreSQL `astronic`, user `astronic_user` (shared dev/prod) |
| Code — dev | `/home/lucus/1os-dev/` (`dev` branch) |
| Code — prod | `/opt/1os/` (`main` branch) |
| Nginx config | `/etc/nginx/sites-available/1os-prod` |
| Gunicorn service | `/etc/systemd/system/gunicorn-1os.service` |
| Cloudflare config | `/etc/cloudflared/config.yml` |
| GitHub | `https://github.com/Limply/1os` (private) |

---

## ADR: Single-Tenant vs Multi-Tenant (June 2026)

**Decision: Single tenant per server (current), multi-tenant architecture KIV.**

`BaseModel` already has a `tenant` FK and `TenantMiddleware` sets `request.tenant` on every request — the plumbing supports multi-tenant. However at current scale (1 active tenant), running multiple tenants on one server adds complexity without benefit.

**When to activate multi-tenant:**

| Condition | Threshold |
|---|---|
| Paying tenants | 5+ |
| Large customer | $50k+/year contract — may justify dedicated instance instead |
| Data residency | Legal requirement (EU, China) |
| Customisation | 30%+ of tenants need different code |

**Current safeguards (relevant even for single tenant):**
- All querysets filter by `tenant=request.tenant` at view level
- `perform_create` always sets `tenant` on new objects
- Role hierarchy enforced: viewer → staff → manager → admin → superadmin

**Planned (not done):**
- Audit log table (`TenantAuditLog`)
- CI check: grep for `.objects.all()` without tenant filter
- `save()` assertion: `tenant is not None`

*Decision: Lucus, June 2026. Revisit when 5th paying tenant onboards.*
