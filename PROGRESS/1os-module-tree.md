# 1OS — One Operating System
## Module & Sub-Module Tree (as-built)

> **Platform:** Multi-tenant | **Stack:** Django + DRF + React + Vite | **Pilot Tenant:** Astronic Services & Trading
> **Scope:** What actually exists in the codebase (models + API routes + frontend pages). Aspirational/unbuilt items are in *Planned* at the bottom.

---

## 🔐 AUTH — `/api/auth/` *(service label `accounts`)*
- **Tenant** — multi-tenant root; `project_prefix` drives project numbering
- **User** — UUID, email login, role (superadmin/admin/manager/staff/viewer) + RBAC guards
- JWT auth (simplejwt): token, refresh, users, tenants, permission-groups

## 🏢 ORGANISATION — `/api/org/`
- **Company** · **Department** · **Team** · **Position** · **Site** · **Client**
- (Client unified into Organisation; `org-tree/` endpoint for the org chart)

---

## 📋 PROJECTS — `/api/projects/`
- **Project** — `project_no` (auto `<prefix>-YY-NNN`), status, priority, client info, site+GPS, manager/supervisor, members, weighted `progress`, `payment_record`
- **Task** — group, status (todo/in_progress/review/done/issue), weightage → drives project progress; photo
- **TaskPhoto** · **TaskDocument** · **TaskComment** · **ProjectComment**
- **DailyReport** — manpower counts, activities, personnel, photo (feeds dashboard)
- **WSHPhoto** — workplace safety & health observations (safe/unsafe/near_miss/hazard)
- *Pages:* Projects, Project Detail, Project Calendar, supervisor mobile app

## 👥 HR — `/api/hr/`
- **Employee** — emp_no, pass type/expiry, dept/position, manager (supervisor), photo, `can_clock_in` (+ `employees/me/`)
- **Leave** — LeaveType · LeaveBalance (per emp/type/year) · LeaveApplication (pending→approved/rejected)
- **Attendance** — clock in/out, hours, OT, photos + GPS + address, project link (geofenced clock-in)
- **Certification** — issuer, cert no, expiry, alert days
- **WorkSchedule** (one-off) · **StaffDeployment** (recurring pattern) · **PublicHoliday** (SG, shared)
- **ManpowerSettings** — per-tenant manpower dashboard visibility
- **PersonalGoal** — "My Tools" goal tracker
- **Claims** — Claim → ClaimItem → ClaimAttachment (monthly expense claims w/ receipts)
- *Pages:* HR (tabs), Clock In, Schedules, Personal

## ⚙️ OPERATIONS — `/api/ops/`
- **Job** — job card; type (installation/maintenance/repair/inspection/wts), status, assigned_to
- **WTSRequest** — Weight Test Scheduling *(Astronic-specific)*: delivery status, driver, live GPS, sign-off, result
- **Asset** — equipment/tool/vehicle/IT registry, warranty/next-service
- **Inspection** — checklist (JSON), pass/fail/conditional, photos, next due
- **Service Reports** — ServiceJob (`SE-YY-NNN`) → ServiceReportItem (issue/action/recommendation) → ServiceReportPhoto; InvoiceLineItem
- *Pages:* Operations (incl. Service Reports)

## 💰 FINANCE — `/api/finance/`
- **Quotation** (`Q-YY-NNN` or project_no) → **QuotationItem** — totals auto-synced via signals, GST 9%
- **Invoice** (`INV-YY-NNN`) → **InvoiceItem** — status unpaid/partial/paid, `balance_due`
- **Payment** — against invoice *or* quotation; recomputes invoice + marks project completed when fully paid
- **DeliveryOrder** (`DO-YY-NNN`) → **DeliveryOrderItem**
- **Expense** — project-tagged costs (feeds P&L)
- *Pages:* Finance (tabs), Payments, P&L

---

## 📌 COMPLIANCE — `/api/compliance/`
- **Licence** · **Incident** *(models exist; frontend page not yet built)*

## 🤝 CRM — `/api/crm/`
- **Contact** · **Lead** · **Interaction** (standalone service, no cross-service imports)
- *Page:* CRM

## 🔔 NOTIFICATIONS — `/api/notify/`
- **Notification** (single model)

## 📊 DASHBOARD — `/api/dashboard/`
- No models — aggregates company-wide project status, manpower & financials into KPI panels

## 📁 FILES
- Embedded FileBrowser (`files.sim-eng.com`); `api/files/proxy/`

---

## 🧱 Shared / platform
| Piece | Role |
|---|---|
| `shared/models` | BaseModel (id, created_at, updated_at, tenant) |
| `shared/storage` | FileBrowserStorage (HR photos, claim receipts) |
| `shared/permissions`, middleware | RBAC + tenant/JWT |
| `gateway/` (Nginx) | serves `frontend/dist`, proxies API |

---

## 🗺️ Planned / not yet built
- **NAS project-file integration** — auto-create/manage NAS `Projects/` tree (plan approved, see `NAS_INTEGRATION_PLAN.md`)
- Compliance frontend page; HR & Ops calendars; Notifications/Telegram bot
- Leave approval workflow + balance deduction; Quotation→Invoice conversion; licence expiry alerts
- Not in v1: Recruitment, Payroll/CPF, Performance, Inventory, document templates

---

*Updated: 2026-06-27 | Reflects current `dev` branch | 1OS by Simply Engineering Pte Ltd*
