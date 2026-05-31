# 1OS — Development Tracker
**Platform:** 1OS by Simply Engineering Pte Ltd
**Pilot Tenant:** Astronic Services & Trading Pte Ltd
**Last Updated:** 2026-05-28 (session 3)

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
| DB models (31) | ✅ Done | All migrated — includes Project, TaskList, Task |
| API routes | ✅ Done | All services routed |
| JWT auth | ✅ Done | 8h access / 7d refresh |
| Tenant scoping (middleware) | ✅ Done | Reads JWT, resolves user → tenant, sets `request.tenant` |
| Django Admin | ✅ Done | All models registered with search, filter, inline items |
| Split settings | ✅ Done | `base.py` / `dev.py` / `prod.py`, secrets via `.env` |
| GitHub repo | ✅ Done | `github.com/Limply/1os` (private) |
| Frontend (React) | ✅ Done | Login, Dashboard, Projects, Files — live at `https://ast1.sim-eng.com` |
| Cloudflare Tunnel | ✅ Done | `ast1.sim-eng.com` → Vite; SSH tunnel at `ssh.ast1.sim-eng.com` |
| Business logic | ❌ Not started | See task list below |
| API contracts | ❌ Not started | Needed before more frontend work |
| Tests | ❌ Not started | |
| Docker | ❌ Not started | Needed for production deployment |
| HR / Ops / Finance / Compliance pages | ❌ Not started | Placeholders only |

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
| Server (Django) | `http://192.168.1.71:8000` |
| Server (Vite) | `http://192.168.1.71:5173` |
| Public URL | `https://ast1.sim-eng.com` |
| Admin (local) | `http://192.168.1.71:8000/admin/` |
| Admin (remote) | SSH tunnel: `ssh -L 8000:localhost:8000 lucus@192.168.1.71` then `http://localhost:8000/admin/` |
| Users | `admin@astronic.com` / `Astronic.2468` · `lucus@astronic.com.sg` / `Astronic.2468` |
| DB | PostgreSQL — database `astronic`, user `astronic_user` |
| Code | `/opt/1os/` |
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
