# 1OS — Project Progress Log
**Platform:** 1OS by Simply Engineering Pte Ltd
**Pilot Tenant:** Astronic Services & Trading Pte Ltd
**Last Updated:** 2026-05-28

---

## What Was Built Today

### 1. Project Structure
Set up a clean Django monolith at `/opt/astronic/` following the architecture defined in `1os-dev-guide.md`.

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
- Dashboard with 4 stat cards
- Sidebar: Dashboard, Projects, HR, Operations, Finance, Compliance, Files
- Projects page: create/list projects with inline task lists and tasks
- Files page: embedded FileBrowser (https://files.sim-eng.com/files/)
- Sidebar shows tenant company name + user name/role from `/api/auth/me/`

---

### 6. Cloudflare Tunnel — Live

- Tunnel ID: `afb68fe8-2a42-4fdc-ae55-22aa402382fd`
- Frontend: `https://ast1.sim-eng.com` → Vite dev server (port 5173)
- SSH access: `ssh.ast1.sim-eng.com` → port 22
- Admin: access via SSH tunnel (`ssh -L 8000:localhost:8000 lucus@192.168.1.71`) then `http://localhost:8000/admin/`

---

### 7. Dev Environment

- Server: `http://192.168.1.71:8000` (Django), `http://192.168.1.71:5173` (Vite)
- Public URL: `https://ast1.sim-eng.com`
- Django Admin: `http://192.168.1.71:8000/admin/`
- Users: `admin@astronic.com` / `Astronic.2468`, `lucus@astronic.com.sg` / `Astronic.2468`
- PostgreSQL: `astronic` database, all migrations applied
- GitHub: `https://github.com/Limply/1os` (private)
- Settings split: `dev.py` / `prod.py` / `base.py`, secrets via `.env`

---

## What's Next (Priority Order)

### Backend (Do First)
- [x] Register all models in `admin.py` per service
- [ ] Write `api-contract.yml` per service
- [ ] Add business logic to each service:
  - [ ] Leave approval workflow (HR)
  - [ ] Job status transitions (Operations)
  - [ ] WTS GPS tracking (Operations)
  - [ ] Auto-generate job/ref numbers (Operations)
  - [ ] Quotation → Invoice conversion (Finance)
  - [ ] GST calculation on save (Finance)
  - [ ] Licence expiry alerts (Compliance)
  - [ ] Telegram bot notifications (Notifications)
- [ ] Add filtering, search, ordering to all ViewSets
- [ ] Write tests (minimum 1 happy + 1 error per endpoint)
- [ ] Assign service owners per `1os-dev-guide.md` team table

### DevOps
- [ ] Configure Nginx gateway (`gateway/`)
- [ ] Write `docker-compose.yml`
- [ ] Per-service Dockerfiles
- [ ] Set up `.env` from `.env.template`

### Frontend (After Backend Contracts Are Stable)
- [x] React + Vite scaffold
- [x] Auth flow (login, token refresh, logout)
- [x] Dashboard layout with sidebar
- [x] Projects + TaskList + Task management pages
- [x] Files page (FileBrowser embed)
- [ ] HR, Operations, Finance, Compliance pages (placeholders only)

---

## Known Issues / Decisions Pending

| Issue | Status |
|---|---|
| **[FIXED 2026-06-16] Photo upload fails on mobile browser** | nginx default `client_max_body_size` is 1MB; mobile camera photos are 3–8MB. Fix: added `client_max_body_size 20M;` to `/etc/nginx/sites-available/1os-prod` on the server. Desktop worked because gallery picks are smaller. |
| `services/core/` exists but has no purpose | Unused — can be deleted |
| Django Admin has no models registered | Needs `admin.py` wiring |
| Compliance module has no assigned dev | Needs owner assignment |
| Dashboard reads across services — architecture not decided | Pending |
| No Payroll, Recruitment, or Performance models yet | Not in schema v1, deferred to v0.3+ |

---

*1OS by Simply Engineering Pte Ltd — Internal Progress Reference*
