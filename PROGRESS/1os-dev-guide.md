# 1OS — Team Development Guide
## Architecture, Standards & Workflow

> **Platform:** 1OS by Simply Engineering Pte Ltd | **Updated:** 2026-06-27
> **Mode:** Multi-developer · Single Django monolith · No Docker · Single-tenant for now (multi-tenant deferred)

---

## 0. What 1OS Is (read first)

- **One Django project** (`project_config`) — **not** microservices. All apps run in a single
  process and share one PostgreSQL DB (`1os_db`).
- **Multi-developer**: each dev *owns* one or more **service apps** under `services/`. Collaboration
  happens through **git branches + PRs**, not separate deployments.
- **Single-tenant for now**: we run one tenant (Astronic). The tenant scaffolding
  (`BaseModel.tenant`, `TenantScopedMixin`) stays wired so multi-tenant is possible later, but
  **building/onboarding new tenants is out of scope** until further notice.
- **No Docker**: dev runs the Django dev server + Vite directly; prod runs Gunicorn + Nginx via systemd.

---

## 1. Architecture Rules

### 1.1 Each app is self-contained
Every service owns its own models, serializers, views, urls, admin, tests.

```
services/hr/
├── models.py        # HR models only
├── serializers.py
├── views.py
├── urls.py
├── admin.py
├── tests.py
└── apps.py
```

### 1.2 Cross-service linking (monolith reality)
We are one process, so direct ORM imports are *allowed*, but keep service boundaries clean and follow
the linking rules in **`DATA-MODEL.md`**:

- **Within a service** → `ForeignKey` (hard link).
- **Across services** → prefer a **loose string ref** (`project_no`, `client_name`) so apps stay
  decoupled; use `ref_type` + `ref_id` for generic links.
- **Cross-service `FK✱`** is allowed only for the blessed exceptions documented in `DATA-MODEL.md`
  (`accounts.User`, `organisation.Site`, and the few named ones). Don't add new cross-service FKs
  without updating that doc.

> When you import another service's model directly, you've coupled to it — note it in `DATA-MODEL.md`.

### 1.3 Shared code goes to `shared/` only
```
shared/
├── models.py        # BaseModel (id=UUID, created_at, updated_at, tenant)
├── storage.py       # FileBrowserStorage
├── permissions.py   # RBAC permission classes
├── middleware.py
└── responses.py
```
Utilities and base classes only — **no business logic** in `shared/`.

### 1.4 API response shape (current standard)
Endpoints return **plain DRF output**, not a custom envelope:
- List endpoints return either a **plain array** or a **paginated object** (`{count, next, previous, results}`).
- **Frontend must guard every list** with `Array.isArray(...)` before setting state (DRF can return either).
- Errors return DRF's `{field: [msgs]}` / `{detail: msg}` — **surface them inline** (no silent `.catch`).

### 1.5 Tenant scoping (single-tenant for now)
- Keep using `TenantScopedMixin` on ViewSets and `tenant` on `BaseModel` — it's already wired and cheap to leave in.
- But **do not build multi-tenant features** (tenant onboarding, schema isolation, per-tenant billing) yet.
- One tenant (Astronic) is assumed everywhere.

---

## 2. Project Structure

```
1os/  (dev: /home/lucus/1os-dev · prod: /opt/1os)
├── project_config/     # Django settings, root urls, wsgi
├── services/
│   ├── auth/           # Tenant, User, JWT  (app label: accounts)
│   ├── organisation/   # Company, Department, Team, Position, Site, Client
│   ├── hr/             # Employee, leave, attendance, schedules, claims, goals
│   ├── projects/       # Project, Task, daily reports, WSH photos
│   ├── operations/     # Jobs, WTS, assets, inspections, service reports
│   ├── finance/        # Quotations, invoices, delivery orders, expenses, payments
│   ├── crm/            # Contact, Lead, Interaction
│   ├── compliance/     # Licence, Incident
│   ├── notifications/  # Notification
│   └── dashboard/      # Aggregated read-only views (no models)
├── shared/             # BaseModel, storage, permissions, middleware
├── frontend/           # Vite + React
├── scripts/            # backup_db.sh, etc.
└── manage.py
```

---

## 3. Team Structure (one owner per service)

| Owner | Service app(s) |
|---|---|
| Dev 1 | `auth` + `organisation` |
| Dev 2 | `hr` |
| Dev 3 | `operations` (+ WTS, service reports) |
| Dev 4 | `finance` |
| Dev 5 | `frontend` (React) |
| Dev 6 | `projects` + `crm` |
| **Lucus** | Architecture, DevOps, review, `compliance`/`dashboard`/`shared` |

**Rule:** one owner per service. Touching someone else's service → coordinate + get review.
Everyone shares the one dev server and one DB; there are **no per-service ports**.

---

## 4. Environments

| | Dev | Prod |
|---|---|---|
| Path | `/home/lucus/1os-dev/` | `/opt/1os/` |
| Branch | `dev` | `main` |
| Backend | Django `:6001` (`--noreload`, `1os-dev-django.service`) | Gunicorn `:6000` (`1os.service`, 3 workers) |
| Frontend | Vite `:6100` → `dev.sim-eng.com` | Nginx → `1os.sim-eng.com` |
| DB | PostgreSQL `1os_db` | ← **same `1os_db`** |
| Admin | `dev.sim-eng.com/admin/` | `1os.sim-eng.com/admin/` |

> ⚠️ Dev and prod **share one DB** — editing on `dev.sim-eng.com` mutates live data. Be careful.
> Dev runs `--noreload`: **restart `1os-dev-django.service` after backend edits** or it serves stale code.
> Per-server ports/hosts are **env-driven via `.env`** (committed, pull-safe).

---

## 5. Git Workflow

```
main     ← production (deploys from /opt/1os)
dev      ← shared integration branch (deploys to dev.sim-eng.com)
feature/<service>-<name>     e.g. feature/finance-payments
fix/<service>-<name>         e.g. fix/hr-leave-balance
```

### Rules
- Branch off `dev`; PR back into `dev`. **Don't commit straight to `main`.**
- `dev` → `main` is the **deploy promotion** (lead/Lucus), fast-forward when clean.
- **Conventional Commits**: `feat(finance): …`, `fix(hr): …`, `docs(progress): …`, `refactor(...)`, `chore(...)`.
- **Back up the DB before any `migrate`** (`scripts/backup_db.sh`) — dev migrations hit the live DB.
- Keep migrations linear so dev and prod histories stay compatible.

---

## 6. API Contract (recommended, not yet adopted)

For multi-dev work, agreeing endpoints up front lets frontend + backend proceed in parallel.
Lightweight is fine — a short list in the service's PR description or a `services/<name>/api-contract.yml`:

```yaml
service: hr
base_url: /api/hr/
endpoints:
  - GET  /employees/        list (paginated)        auth, [admin, manager]
  - POST /employees/        create                  auth, [admin]
  - GET  /employees/me/     current user's employee auth, [all]
```

> Status: no contract files exist yet. Optional, but encouraged for any new multi-endpoint feature.

---

## 7. Coding Standards

### Models
- Inherit `BaseModel` (UUID PK, `created_at`, `updated_at`, `tenant`).
- `__str__` + docstring on every model.
- FK naming: model name, **no `_id` suffix** (`quotation`, not `quotation_id`). Loose refs use `_no`/`_name`. See `DATA-MODEL.md`.
- Auto-numbering is year-based per doc type (`Q-YY-NNN`, `INV-YY-NNN`, `SE-YY-NNN`, …).

### Views
- DRF `ViewSet` / `APIView`; apply `TenantScopedMixin` + `shared/permissions`.
- Handle errors explicitly — **no bare `except`**.

### Serializers
- Expose `*_display` / related labels read-only as needed; never expose secrets.
- Remember the frontend's `Array.isArray` contract (§1.4).

### Frontend
- Guard list state with `Array.isArray`.
- Every save/submit shows **inline red error text** — never a silent `.catch(() => {})`.

### Tests
- Target: ≥1 happy + ≥1 error test per endpoint.
- **Current reality:** only `hr` has tests (16). Everything else is at 0 — adding tests when you touch a service is the fastest way to close this.

---

## 8. Environment Variables

- **One `.env` per server** (dev and prod each have their own). **Never commit `.env`.**
- Per-server settings (Vite port/proxy/hosts, `ALLOWED_HOSTS`, CSRF) are read from `.env` so a plain
  `git pull` is safe on every server.

```bash
# .env (per server) — values differ dev vs prod
DEBUG=True|False
SECRET_KEY=…
DB_NAME=1os_db
DB_HOST=localhost
DB_PORT=5432
ALLOWED_HOSTS=dev.sim-eng.com,localhost,127.0.0.1   # prod: 1os.sim-eng.com,…
VITE_PORT=6100
VITE_API_TARGET=http://127.0.0.1:6001
FILEBROWSER_URL=http://localhost:8080
```

`.gitignore`: `.env`, `*.env`, `venv/`, `__pycache__/`, `*.pyc`

---

## 9. Pre-Coding Checklist (per feature)

- [ ] Pulled latest `dev`
- [ ] Feature branch created (`feature/<service>-<name>`)
- [ ] Endpoints agreed (PR description or `api-contract.yml`) if multi-endpoint
- [ ] Cross-service links follow `DATA-MODEL.md` (ref vs FK✱)
- [ ] DB backed up before any `migrate`
- [ ] Tests for new endpoints; restart `1os-dev-django.service` after backend edits

---

## 10. Key Documents

| Document | Location | Purpose |
|---|---|---|
| Module Tree (as-built) | `1os-module-tree.md` | What modules/features exist |
| Data Model | `DATA-MODEL.md` | Relationships, naming, FK/ref rules |
| Progress Log | `PROGRESS.md` | What's built / what's next |
| Backup & Restore | `BACKUP.md` | `scripts/backup_db.sh` usage |
| Dev Guide (this) | `1os-dev-guide.md` | Architecture, standards, workflow |

---

*1OS by Simply Engineering Pte Ltd — Internal Development Reference*
