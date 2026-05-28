# 1OS — Team Development Guide
## Architecture, Standards & Workflow

> **Platform:** 1OS by Simply Engineering Pte Ltd | **Updated:** 2026-05-23

---

## 1. Architecture Rules (Non-Negotiable)

### 1.1 Each App is Fully Self-Contained
Every service owns its own models, serializers, views, URLs, and tests. No exceptions.

```
services/hr/
├── models.py        # HR models only
├── serializers.py   # HR serializers only
├── views.py         # HR views only
├── urls.py          # HR URLs only
├── tests.py
├── admin.py
└── apps.py
```

### 1.2 Cross-App Communication via API Only
Apps never import from each other directly.

```python
# ❌ WRONG — direct import
from services.hr.models import Employee

# ✅ RIGHT — API call
import requests
response = requests.get('http://localhost/api/hr/employees/')
```

### 1.3 Shared Code Goes to `shared/` Only
```
shared/
├── models.py       # BaseModel (created_at, updated_at, tenant_id)
├── permissions.py  # Role-based permission classes
├── utils.py        # PDF, email, Telegram helpers
├── middleware.py   # Tenant detection, JWT validation
└── responses.py    # Standard API response format
```
No business logic in `shared/`. Utilities and base classes only.

### 1.4 Standard API Response Format
All endpoints must return this structure:
```json
{
  "success": true,
  "data": {},
  "message": "",
  "errors": []
}
```

### 1.5 Always Filter by Tenant
Every query must be scoped to the current tenant.
```python
# ✅ Correct
Employee.objects.filter(tenant=request.tenant)

# ❌ Wrong
Employee.objects.all()
```

---

## 2. Project Structure

```
/opt/1os/
├── project_config/     # Django settings, root URLs
├── services/
│   ├── auth/           # Auth, JWT, MFA
│   ├── organisation/   # Company, dept, team, positions
│   ├── hr/             # Employee, leave, attendance, payroll
│   ├── operations/     # Jobs, scheduling, WTS, assets
│   ├── finance/        # Quotations, invoices, expenses
│   ├── notifications/  # Telegram, email, in-app
│   └── dashboard/      # Aggregated views
├── shared/             # BaseModel, utils, middleware
├── frontend/           # Vite + React
├── gateway/            # Nginx config
├── docker-compose.yml
└── manage.py
```

---

## 3. Team Structure

| Dev | Owns | Service Port |
|---|---|---|
| Dev 1 | Auth + Organisation | 9001, 9002 |
| Dev 2 | HR | 9003 |
| Dev 3 | Operations + WTS | 9004 |
| Dev 4 | Finance | 9005 |
| Dev 5 | Frontend (React) | 5173 |
| **Lucus** | Architecture, DevOps, Review | — |

**Rule:** One dev per service. No overlap without lead approval.

---

## 4. Gateway Routing (Nginx)

All services merge at the gateway level only. Code never merges — only routes do.

```
ast1.sim-eng.com
├── /api/auth/      → auth-service:9001
├── /api/org/       → org-service:9002
├── /api/hr/        → hr-service:9003
├── /api/ops/       → ops-service:9004
├── /api/finance/   → finance-service:9005
├── /api/notify/    → notify-service:9006
└── /               → frontend:5173
```

---

## 5. Git Branching Strategy

```
main          ← stable, production only
develop       ← integration branch
feature/hr-leave
feature/ops-wts
feature/finance-quotation
fix/auth-token-expiry
```

### Rules
- **Never push directly to `main`**
- All work on `feature/` or `fix/` branches
- PR to `develop` — must pass tests before merge
- Weekly merge `develop` → `main` by lead
- Branch naming: `feature/<service>-<feature>` e.g. `feature/hr-leave`
- Commit messages: `[service] action: description` e.g. `[hr] add: leave application endpoint`

---

## 6. API Contract (Define Before Coding)

Every service must define its API contract **before** writing code. Frontend and backend code against the contract independently.

### Template
```yaml
# services/hr/api-contract.yml

service: hr
base_url: /api/hr/

endpoints:
  - method: GET
    path: /employees/
    description: List all employees
    auth: required
    permissions: [admin, manager]
    response: paginated list of Employee

  - method: POST
    path: /employees/
    description: Create employee
    auth: required
    permissions: [admin]
    body: {name, email, department, position}

  - method: GET
    path: /employees/{id}/
    description: Get employee detail
    auth: required
    permissions: [admin, manager, self]

  - method: POST
    path: /leave/apply/
    description: Submit leave application
    auth: required
    permissions: [all staff]
    body: {leave_type, start_date, end_date, reason}
```

---

## 7. Coding Standards

### Models
- Always inherit `BaseModel` from `shared/`
- Use `UUID` as primary key
- Always include `__str__` method
- Add docstring to every model

```python
from shared.models import BaseModel

class Employee(BaseModel):
    """Represents a staff member within a tenant organisation."""
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.name
```

### Views
- Use DRF `ViewSet` or `APIView`
- Always use `shared/permissions.py` for access control
- Docstring on every view
- Handle errors explicitly — no bare `except`

### Serializers
- One serializer per use case (List, Detail, Create, Update)
- Never expose sensitive fields (password, internal IDs)

### Tests
- Minimum 1 test per endpoint
- Test happy path + at least 1 error case
- Use Django `TestCase` or `pytest-django`

```python
def test_employee_list_requires_auth(self):
    response = self.client.get('/api/hr/employees/')
    self.assertEqual(response.status_code, 401)
```

---

## 8. Docker Workflow

Each dev runs only their service locally.

```bash
# Dev working on HR only
docker-compose up hr-service db

# Full stack
docker-compose up
```

### Per-service Dockerfile template
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "project_config.wsgi:application", "--bind", "0.0.0.0:9003"]
```

### docker-compose.yml structure
```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: 1os
      POSTGRES_USER: 1os_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  auth-service:
    build: ./services/auth
    ports: ["9001:9001"]
    depends_on: [db]

  hr-service:
    build: ./services/hr
    ports: ["9003:9003"]
    depends_on: [db, auth-service]

  frontend:
    build: ./frontend
    ports: ["5173:5173"]

  gateway:
    image: nginx
    ports: ["9000:80"]
    depends_on: [auth-service, hr-service, frontend]
```

---

## 9. Environment Variables

Each service has its own `.env` file. Never commit `.env` to git.

```bash
# .env template per service
DEBUG=False
SECRET_KEY=your-secret-key
DB_HOST=db
DB_NAME=1os
DB_USER=1os_user
DB_PASSWORD=
ALLOWED_HOSTS=ast1.sim-eng.com,localhost
TENANT_ID=astronic
TELEGRAM_BOT_TOKEN=
```

Add `.env` to `.gitignore`:
```
.env
*.env
venv/
__pycache__/
*.pyc
```

---

## 10. Pre-Coding Checklist (per service)

Before any dev starts writing code:

- [ ] API contract defined (`api-contract.yml`)
- [ ] DB schema drawn (`dbdiagram.io` or draw.io)
- [ ] Feature branch created (`feature/<service>-<name>`)
- [ ] Docker service entry added to `docker-compose.yml`
- [ ] `.env` template updated
- [ ] Reviewed this guide

---

## 11. Key Documents

| Document | Location | Status |
|---|---|---|
| Module Tree | `1os-module-tree.md` | ✅ Done |
| Dev Guide (this) | `1os-dev-guide.md` | ✅ Done |
| API Contracts | `services/<name>/api-contract.yml` | 🔲 Per dev |
| DB Schemas | `services/<name>/schema.md` | 🔲 Per dev |
| Coding Standards | This doc § 7 | ✅ Done |
| Git Guide | This doc § 5 | ✅ Done |

---

*1OS by Simply Engineering Pte Ltd — Internal Development Reference*
