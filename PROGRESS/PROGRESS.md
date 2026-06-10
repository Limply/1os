# 1OS — Project Progress Log
**Platform:** 1OS by Simply Engineering Pte Ltd
**Pilot Tenant:** Astronic Services & Trading Pte Ltd
**Last Updated:** 2026-06-10

---

## Dev / Prod Quick Reference

| | Dev | Prod |
|---|---|---|
| **Code here** | `/opt/1os/` (`dev` branch) | `/home/lucus/1os-prod/` (`main` branch) |
| **Start** | `./start_dev.sh` | `./start_prod.sh` |
| **URL** | `http://localhost:5173` | `https://ast1.sim-eng.com` |

**Deploy:** merge `dev` → `main`, `git pull` in prod, `npm run build`, restart Gunicorn.
See `DEVELOPMENT.md` for full deploy steps.

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

- **WhiteNoise** serves built React `dist/` from Django (no Nginx needed)
- **Gunicorn** (3 workers) replaces `runserver` in production
- **Cloudflare Tunnel:** `ast1.sim-eng.com` → `:8000` (single rule, covers all traffic)
- **Separate prod folder:** `/home/lucus/1os-prod/` on `main` branch
- **Dev/prod isolation:** dev at `/opt/1os/` (`dev` branch), prod at `/home/lucus/1os-prod/` (`main` branch)

---

### 7. Environment Summary

| Item | Dev | Prod |
|---|---|---|
| Path | `/opt/1os/` | `/home/lucus/1os-prod/` |
| Branch | `dev` | `main` |
| Backend | `runserver :8000` | Gunicorn `:8000` |
| Frontend | Vite `:5173` (hot reload) | Built `dist/` via WhiteNoise |
| URL | `http://localhost:5173` | `https://ast1.sim-eng.com` |
| DB | PostgreSQL `astronic` (shared) | ← same |
| Admin | `http://localhost:8000/admin/` | SSH tunnel only |
| GitHub | `github.com/Limply/1os` (private) | ← same |

---

## What's Next (Priority Order)

### Frontend
- [ ] Operations page (Jobs, WTS)
- [ ] Finance page (Quotations, Invoices, Payments)
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
- [ ] GST auto-calculation on save (9%)
- [ ] Licence expiry alerts (Compliance)
- [ ] Dashboard aggregate endpoint (active jobs, pending approvals, revenue MTD)

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
| `services/core/` exists but has no purpose | Unused — can be deleted |
| Django Admin has no models registered | Needs `admin.py` wiring |
| Compliance module has no assigned dev | Needs owner assignment |
| Dashboard reads across services — architecture not decided | Pending |
| No Payroll, Recruitment, or Performance models yet | Not in schema v1, deferred to v0.3+ |

---

*1OS by Simply Engineering Pte Ltd — Internal Progress Reference*
