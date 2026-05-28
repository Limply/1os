# 1OS — Project Progress Log
**Platform:** 1OS by Simply Engineering Pte Ltd
**Pilot Tenant:** Astronic Services & Trading Pte Ltd
**Last Updated:** 2026-05-23

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

### 5. Dev Environment

- Server running at `http://192.168.1.71:8000`
- Django Admin at `http://192.168.1.71:8000/admin/`
- Test superuser: `admin@astronic.com` / `Admin.1234`
- PostgreSQL: `astronic` database, all migrations applied

---

## What's Next (Priority Order)

### Backend (Do First)
- [ ] Register all models in `admin.py` per service
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
- [ ] React + Vite scaffold
- [ ] Auth flow (login, token refresh)
- [ ] Dashboard layout
- [ ] Per-module pages

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
