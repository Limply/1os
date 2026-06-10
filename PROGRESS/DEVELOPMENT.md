# 1OS — Development Tracker
**Platform:** 1OS by Simply Engineering Pte Ltd
**Pilot Tenant:** Astronic Services & Trading Pte Ltd
**Last Updated:** 2026-06-10 (session 6)

---

## Dev / Prod Workflow

### Environments

| | Dev | Prod |
|---|---|---|
| **Path** | `/opt/1os/` | `/home/lucus/1os-prod/` |
| **Branch** | `dev` | `main` |
| **Frontend** | Vite `:8100` (hot reload, proxies API to :8001) | Nginx `:8000` serves `frontend/dist/` directly |
| **Backend** | Django `runserver :8001` | Gunicorn `:8002` (internal, Nginx proxies) |
| **DEBUG** | `True` | `False` |
| **Public URL** | `https://ast2.sim-eng.com` | `https://ast1.sim-eng.com` |
| **Start** | `./start_dev.sh` | systemd manages Nginx + Gunicorn automatically |

> **Always code in `/opt/1os/`** — never edit files directly in `/home/lucus/1os-prod/`

### Port Map

| Port | Process | Purpose |
|---|---|---|
| `:8000` | Nginx (prod) | Public — `ast1.sim-eng.com` via Cloudflare |
| `:8001` | Django `runserver` (dev) | Internal — dev API backend |
| `:8002` | Gunicorn (prod) | Internal — prod API backend, Nginx proxies here |
| `:8100` | Vite (dev) | Public — `ast2.sim-eng.com` via Cloudflare |

### Stack

| Layer | Dev | Prod |
|---|---|---|
| Web server | — | Nginx (serves static files + proxies `/api/`, `/admin/`) |
| App server | Django `runserver` | Gunicorn (3 workers) |
| Static files | Vite HMR | Nginx serves `frontend/dist/` directly |
| Admin static | Django staticfiles | Nginx serves `staticfiles/` at `/static/` |
| Process mgmt | manual / `start_dev.sh` | systemd (`gunicorn-1os`, `nginx`) |

### Daily Dev Flow

```bash
cd /opt/1os
./start_dev.sh          # starts Django :8001 + Vite :8100

# make changes (Vite hot-reloads instantly)
# then commit:
git add <files>
git commit -m "Feature: ..."
git push origin dev
```

Access dev at `https://ast2.sim-eng.com` or `http://192.168.1.71:8100`

### Deploy to Production

```bash
# 1. Merge dev → main and push
git checkout main
git merge dev
git push origin main

# 2. Pull in prod folder
cd /home/lucus/1os-prod
git pull origin main

# 3. Rebuild frontend
cd frontend && npm run build && cd ..

# 4. Apply migrations + collect admin static files
source venv/bin/activate
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# 5. Restart Gunicorn (Nginx stays running — no restart needed for code changes)
sudo systemctl restart gunicorn-1os
```

### Nginx Config
File: `/etc/nginx/sites-available/1os-prod`
- Serves `frontend/dist/` at root — `try_files $uri /index.html` for SPA routing
- Serves `staticfiles/` at `/static/` — Django admin CSS/JS
- Proxies `/api/` and `/admin/` to Gunicorn at `127.0.0.1:8002`

### systemd Services
| Service | Command | Purpose |
|---|---|---|
| `gunicorn-1os` | `sudo systemctl restart gunicorn-1os` | Prod Django app server |
| `nginx` | `sudo systemctl restart nginx` | Prod web server |
| `cloudflared` | `sudo systemctl restart cloudflared` | Cloudflare tunnel |

### Git Rules
- All code changes on `dev` branch — merge to `main` only when tested
- Never edit files in `/home/lucus/1os-prod/` directly
- Never force push to `main`
- Commit after every completed feature

---

## Coding Rules

### Decoupling (Primary Rule)
Each service module is fully independent. A change in one module must never break another.

| Rule | Detail |
|---|---|
| No cross-service imports | Services never import models or functions from each other |
| API-only communication | Services talk via HTTP API calls, not direct DB queries |
| Shared layer only | Only `shared/` (BaseModel, middleware) and `accounts.User` may be referenced across services |
| Loose linking | Cross-module references use `ref_type` + `ref_id` (not FK) |
| Independent migrations | Each service manages its own migrations — no cross-service dependencies |
| Frontend mirrors this | Each page/feature only calls its own service API endpoints |

### Calendar Architecture
- `components/CalendarView.jsx` — shared FullCalendar UI wrapper, accepts `events[]` prop only
- Each module owns its own calendar page (data fetching, filters, modals)
- `pages/Calendar.jsx` — Projects calendar (tasks + project date bars + dept filter)
- Future: `pages/hr/Calendar.jsx`, `pages/ops/Calendar.jsx` — each uses `CalendarView`
- Never put business data or API calls inside `CalendarView`

### Django Rules
- `perform_create` always sets `tenant=request.tenant`
- Admin uses `TenantModelAdmin` to auto-set tenant on save
- Settings split: `base.py` / `dev.py` / `prod.py`, secrets in `.env`
- Never hardcode tenant, credentials, or environment values

### Code Style
- No comments unless the WHY is non-obvious
- No error handling for things that can't happen
- No abstractions beyond what the task needs
- No backwards-compatibility hacks

### Git
- Commit after every completed feature
- Always push to `github.com/Limply/1os`
- Never force push to main

---

## Current State

| Area | Status | Notes |
|---|---|---|
| Project structure | ✅ Done | `/opt/1os/` — correct location |
| DB models (30) | ✅ Done | All migrated — TaskList merged into Task (project FK + group field) |
| API routes | ✅ Done | All services routed |
| JWT auth | ✅ Done | 8h access / 7d refresh |
| Tenant scoping (middleware) | ✅ Done | Reads JWT, resolves user → tenant, sets `request.tenant` |
| Django Admin | ✅ Done | All models registered with search, filter, inline items |
| Split settings | ✅ Done | `base.py` / `dev.py` / `prod.py`, secrets via `.env` |
| GitHub repo | ✅ Done | `github.com/Limply/1os` (private) |
| Frontend (React) | ✅ Done | Login, Dashboard, Projects, Files, Calendar — live at `https://ast1.sim-eng.com` |
| Cloudflare Tunnel | ✅ Done | `ast1.sim-eng.com` → 5173 (1OS); `ast-iot.sim-eng.com` → 6123; SSH at `ssh.ast1.sim-eng.com` |
| Calendar (Projects) | ✅ Done | Company calendar with dept filter, project bars, task dots, unscheduled summary |
| CalendarView component | ✅ Done | Shared FullCalendar wrapper at `components/CalendarView.jsx` |
| HR module (staff) | ✅ Done | My Leave, Attendance, My Profile, Courses — role-gated tabs |
| HR module (manager) | ✅ Done | Employees, Approvals tabs; manager-only log attendance |
| Clock-In | ✅ Done | Photo + GPS + geofence (200m), watermark, FileBrowser upload, sidebar sub-link |
| Work Schedules | ✅ Done | CSV-backed schedules, import/export, geofence enforcement |
| Module access control | ✅ Done | Per-user module list (JSONField), sidebar + route gating |
| Change password | ✅ Done | Sidebar footer modal, all users |
| User accounts (workers) | ✅ Done | 26 accounts created, password `Astronic.7890` |
| Project tasks | ✅ Done | Groups, task rows, status/priority/weightage, start/end dates, delete (manager+) |
| Task photos | ✅ Done | Multiple photos per task, comment, uploader, table view, lightbox, green dot indicator |
| Task documents | ✅ Done | Multiple docs per task, comment, uploader, file type icons, download links, green dot indicator |
| PDF/Excel export | ✅ Done | Task list export with groups, weightage, dates — jsPDF + xlsx |
| Business logic | ❌ Not started | See task list below |
| API contracts | ❌ Not started | Needed before more frontend work |
| Tests | ❌ Not started | |
| Docker | ❌ Not started | Needed for production deployment |
| HR / Ops / Finance / Compliance pages | 🔄 In progress | HR done; others placeholders |
| HR Calendar | ❌ Not started | Leave applications, public holidays — uses `CalendarView` |
| Ops Calendar | ❌ Not started | Jobs, site visits — uses `CalendarView` |

---

## Known Issues

| # | Issue | File | Priority |
|---|---|---|---|
| 1 | ~~`TenantMiddleware` is a stub~~ | `shared/middleware.py` | ✅ Fixed |
| 2 | ~~All `admin.py` files are empty~~ | all services | ✅ Fixed |
| 3 | `services/core/` is empty and unused | `services/core/` | 🟢 Low — delete it |
| 4 | DB defaults still reference `astronic` name | `project_config/settings.py:48` | 🟡 High — move to `.env` |
| 5 | `services/dashboard/` has no serializers | `services/dashboard/` | 🟡 High |

---

## Task List

### 🔴 Fix First (Blockers)

- [x] **Implement TenantMiddleware** — reads JWT, resolves user → tenant, sets `request.tenant`

### 🟡 Backend — Core

- [x] **Register models in admin.py** — all 7 services (auth, organisation, hr, operations, finance, compliance, notifications)
- [ ] **Write API contracts** — one `api-contract.yml` per service
  - Must be done before frontend starts
- [ ] **Delete `services/core/`** — empty, unused
- [ ] **Move DB credentials to `.env`** — remove `astronic` hardcoded defaults from settings

### 🟡 Backend — Business Logic

- [ ] **HR** — Leave approval workflow (pending → approved/rejected, notify employee)
- [ ] **HR** — Leave balance deduction on approval
- [ ] **Operations** — Job status transitions (draft → assigned → in_progress → completed)
- [ ] **Operations** — Auto-generate job numbers (e.g. `JOB-2026-0001`)
- [ ] **Operations** — WTS ref number auto-generation
- [ ] **Operations** — WTS GPS live tracking (update `current_lat`, `current_lng`)
- [ ] **Finance** — Quotation → Invoice conversion endpoint
- [ ] **Finance** — GST auto-calculation on save (9%)
- [ ] **Finance** — Auto-generate quote/invoice numbers
- [ ] **Compliance** — Licence expiry alert triggers (30 / 14 / 7 days)
- [ ] **Notifications** — Telegram bot integration
- [ ] **Notifications** — Email (SMTP) integration
- [ ] **Dashboard** — Aggregate endpoint (active jobs, pending approvals, revenue MTD)

### 🟡 Backend — Quality

- [ ] **Add filtering, search, ordering** to all ViewSets
- [ ] **Write tests** — minimum 1 happy + 1 error per endpoint
- [ ] **Standardise responses** — all endpoints must return `{success, data, message, errors}`

### 🟢 DevOps — Docker

- [ ] Write `docker-compose.yml` (backend, db, redis, celery, frontend, gateway)
- [ ] Write `Dockerfile` for Django backend
- [ ] Write `Dockerfile` for React frontend
- [ ] Write `gateway/nginx.conf`
- [ ] Create `.env.template` with all required variables
- [ ] Test full stack: `docker-compose up`

### 🟢 Frontend — React + Vite

> Blocked until API contracts are written

- [ ] Scaffold React + Vite project in `frontend/`
- [ ] Auth flow (login, token refresh, logout)
- [ ] Dashboard layout + sidebar navigation
- [ ] Per-module pages (HR, Operations, Finance, Compliance)

---

## Service Ownership

| Dev | Service | Status |
|---|---|---|
| Dev 1 | Auth + Organisation | Models done, logic pending |
| Dev 2 | HR | Models done, logic pending |
| Dev 3 | Operations + WTS | Models done, logic pending |
| Dev 4 | Finance | Models done, logic pending |
| Dev 5 | Frontend | Not started |
| **Lucus** | Architecture, DevOps, Review | — |

---

## Dev Environment

| Item | Value |
|---|---|
| Dev URL (1OS) | `https://ast2.sim-eng.com` or `http://192.168.1.71:8100` |
| Prod URL (1OS) | `https://ast1.sim-eng.com` |
| Dev backend | `http://192.168.1.71:8001` (Django runserver) |
| Prod backend | `http://192.168.1.71:8002` (Gunicorn, internal only) |
| IoT app | `https://ast-iot.sim-eng.com` → `:6123` |
| Files | `https://files.sim-eng.com` → FileBrowser `:8088` |
| Django Admin (prod) | SSH tunnel: `ssh -L 8002:localhost:8002 lucus@192.168.1.71` then `http://localhost:8002/admin/` |
| Django Admin (direct) | `https://ast1.sim-eng.com/admin/` (proxied via Nginx) |
| Users | `admin@astronic.com.sg` / `Astronic.2468` · `lucus@astronic.com.sg` / `Astronic.2468` |
| DB | PostgreSQL — database `astronic`, user `astronic_user` (shared between dev and prod) |
| Code (1OS dev) | `/opt/1os/` (`dev` branch) |
| Code (1OS prod) | `/home/lucus/1os-prod/` (`main` branch) |
| Code (IoT) | `/home/lucus/astronic-iot/` |
| Nginx config | `/etc/nginx/sites-available/1os-prod` |
| Gunicorn service | `/etc/systemd/system/gunicorn-1os.service` |
| Cloudflare config | `/etc/cloudflared/config.yml` |
| GitHub | `https://github.com/Limply/1os` (private) |

---

## Recommended Next Steps (in order)

1. ~~Fix `TenantMiddleware`~~ ✅
2. ~~Register all models in `admin.py`~~ ✅
3. Write API contracts per service
4. Assign devs to write business logic per service
5. Write `docker-compose.yml`
6. Start frontend after contracts are stable

---

*Update this file as tasks are completed. Change `- [ ]` to `- [x]` when done.*

---

## Architectural Decision: Multi-Tenant vs Docker-per-Tenant (June 2026)

### Question
Should 1OS be deployed as a separate Docker container per tenant to eliminate multi-tenant complexity and cross-tenant risk?

### Decision: **Stay Multi-Tenant (for now)**

**Rationale:** Docker-per-tenant adds more operational overhead than it eliminates at current scale (1-3 tenants). A single Django instance serving all tenants is simpler, more resource-efficient, and faster to update.

### Context
- **Current tenants:** 1 active (Astronic), pipeline 1-2 more
- **Expected growth:** 5-20 tenants within 12 months
- **Operational capacity:** Single DevOps engineer (Lucus)
- **Infrastructure:** Simple VPS/cloud instance, not Kubernetes

### Analysis

#### Docker-per-Tenant Would Require
| Item | Cost / Effort |
|---|---|
| Manage 20+ containers | High — needs Kubernetes |
| Per-tenant CI/CD pipeline | Medium — per-tenant builds |
| Monitoring 20+ app instances | High — 20 dashboards, 20 alert channels |
| Database per tenant (option A) | Medium — 20 DBs, more backup complexity |
| Shared database (option B) | Medium — still need cross-tenant filters anyway |
| Per-tenant secrets/config | Medium — 20 `.env` files |
| Rolling updates | Hard — update all 20 without downtime |
| Resource scaling | Bad — small tenants waste resources; each gets full app |

**Rough cost:** $5000-15000/month ops + licensing for K8s, monitoring, per-tenant tools.

#### Multi-Tenant (Current) Provides
| Item | Benefit |
|---|---|
| Single app instance | Scales by adding replicas, not containers |
| One deployment pipeline | One CI/CD run updates all tenants |
| Shared resources | Resource-efficient (small tenants don't get wasted CPU) |
| Fast updates | One code push, all tenants benefit immediately |
| Unified monitoring | One dashboard, one alert channel |
| One database | Simpler backups; cross-tenant queries possible (if needed) |

**Rough cost:** $500-2000/month ops.

### Risk Mitigation (Multi-Tenant)

#### 1. Cross-Tenant Data Leakage
**Safeguard:** All querysets filtered by `tenant=request.user.tenant` at the view/serializer level.
```python
# Every view must use this pattern
qs = Employee.objects.filter(tenant=request.user.tenant)
```
**Test:** Multi-tenant isolation test matrix (create Astronic + other tenant user, verify data separation).

#### 2. Shared Data Ambiguity
**Safeguard:** Mark models that are truly global vs per-tenant.
```python
class Settings(models.Model):
    # Global — accessed by all tenants, no tenant FK
    smtp_host = models.CharField(...)
    feature_flags = models.JSONField(...)

class Employee(models.Model):
    # Per-tenant — always filter by tenant
    tenant = models.ForeignKey(Tenant, ...)
```

#### 3. Admin Permission Complexity
**Safeguard:** Role-based access (role='admin' → full CRUD on own tenant; is_superuser → global).
- Implemented in `/opt/1os/shared/admin.py` and `/opt/1os/services/auth/admin.py`
- `has_module_permission()` and `get_model_perms()` grant access without needing Django permission table

#### 4. Django Version Compatibility
**Safeguard:** Monitor Django release notes; add CI checks to catch permission method changes.

### When to Reconsider Docker-per-Tenant

**Switch to per-tenant Docker if:**

| Condition | Trigger | Action |
|-----------|---------|--------|
| **Tenants** | 20+ active tenants | Evaluate ops burden |
| **Revenue** | Large customer ($50k+/year) | May justify dedicated instance |
| **Customization** | 30%+ of tenants need custom code | Per-tenant builds needed |
| **Regulation** | Data residency laws (China, EU) | Per-country deployments |
| **Compliance** | SOC 2 / HIPAA audit failure | Stricter isolation needed |
| **Ops maturity** | Kubernetes + CDCI team hired | Infrastructure ready |

**At that point:** Migrate to **Kubernetes-per-tenant with Helm charts**, not raw Docker.

### Current Safeguards in Place (June 2026)

✅ **Tenant scoping:**
- Middleware reads JWT, resolves `request.user.tenant`
- All model querysets filter by tenant
- FK dropdowns scoped to own tenant

✅ **Admin access control:**
- role='admin' → full CRUD on own tenant (no is_superuser needed)
- Tenant + PermissionGroup → superuser only
- `has_module_permission()` + `get_model_perms()` (Django 5.2 compatible)

✅ **Role hierarchy:**
- viewer (read-only) → staff (portal) → manager (team) → admin (tenant) → superadmin (global)

### Planned Safeguards (Next Sprint)

⏳ **Audit logging:** TenantAuditLog table to track all data access per tenant  
⏳ **Test isolation:** Parametrized tests verify every model filters by tenant  
⏳ **CI checks:** Pre-commit hooks to catch unfiltered querysets (grep for `.objects.all()` without tenant filter)  
⏳ **Explicit assertion:** Model `save()` method asserts `tenant is not None` before insert

### References
- Implementation: `/opt/1os/shared/admin.py`, `/opt/1os/services/auth/admin.py`
- Django 5.2 AdminSite: Uses `has_module_permission()`, not `has_module_perms()`
- Tenant middleware: `/opt/1os/shared/middleware.py`

---

*Decision made June 2026 by Lucus (CTO). Revisit Q4 2026 or if tenant count exceeds 15.*
