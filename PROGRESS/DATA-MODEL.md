# 1OS — Data Model Design
**Purpose:** Define cross-module relationships, naming conventions, and planned structure.
**Last Updated:** 2026-06-14 (Finance gaps resolved)

> For per-model field lists, see `1os-schema.md`.

---

## Field Naming Convention

| Type | Rule | Example |
|---|---|---|
| ForeignKey | Model name in snake_case — **no `_id` suffix** | `quotation`, `invoice`, `project`, `task`, `site`, `department` |
| User / person FK | Role-based name | `prepared_by`, `assigned_to`, `uploaded_by`, `author`, `supervisor` |
| Loose string ref | Descriptive with `_no` or `_name` suffix | `project_no`, `client_name`, `invoice_no`, `do_no` |
| Status | Always just `status` | `status` |
| Dates | `_date` suffix | `issue_date`, `due_date`, `join_date`, `start_date` |
| Amounts | Descriptive | `subtotal`, `gst_amount`, `total`, `unit_price`, `paid_amount` |
| Document numbers | `_no` suffix | `quote_no`, `invoice_no`, `do_no`, `job_no`, `project_no` |

> **Note:** Schema diagrams and plan docs use `quotation_id`, `employee_id` etc. as conceptual notation only. Actual Django field names never use the `_id` suffix on FKs.

---

## Decoupling Rule

| Scope | Link method |
|---|---|
| Within same service | ForeignKey (hard link) |
| Cross-service | Loose string (`project_no`, `client_name`) or generic (`ref_type` + `ref_id`) |
| Exception | `accounts.User` and `organisation.Site` may be FK-referenced across services |

---

## Cross-Module Relationship Map

| Group | Model | Links to | Field | How (Planned) | Status |
|---|---|---|---|---|---|
| **CRM** | Lead | Finance · Quotation | `client_name` | string copy on convert | ✗ CRM module not yet built |
| **CRM** | Client | Project · Project | `client_name` | string copy | ✗ CRM module not yet built |
| **Finance** | Quotation | QuotationItem | `quotation` | FK | ✓ |
| **Finance** | Quotation | Invoice | `quotation` | FK optional | ✓ `Invoice.quotation` |
| **Finance** | Quotation | DeliveryOrder | `quotation` | FK optional | ✓ `DO.quotation` |
| **Finance** | Quotation | Payment | `quotation` | FK optional | ✓ `Payment.quotation` |
| **Finance** | Invoice | InvoiceItem | `invoice` | FK | ✓ |
| **Finance** | Invoice | DeliveryOrder | `invoice` | FK optional | ✓ `DO.invoice` |
| **Finance** | Invoice | Payment | `invoice` | FK optional | ✓ |
| **Finance** | Quotation | Project | `project_no` | string loose | ✓ |
| **Finance** | Invoice | Project | `project_no` | string loose | ✓ |
| **Finance** | DeliveryOrder | Project | `project_no` | string loose | ✓ |
| **Finance** | Expense | Project | `project_no` | string loose | ✓ |
| **Finance** | Payment | Project | `project_no` | string loose | ✓ |
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
| **Manpower** | Employee | Deployment | `employee` | FK | ✓ `StaffDeployment` |
| **Manpower** | Employee | Levy | `employee` | FK | ✗ No Levy model |
| **Manpower** | Employee | Project Job | `employee` | FK (assigned) | ✗ No Employee→Job link |
| **Admin** | Site | Project | `site` | FK optional | ✗ Project has no `site` FK |
| **Admin** | Site | Quotation | `site` | FK optional | ✓ `Quotation.site` |
| **Admin** | Department | Employee | `department` | FK | ✓ |
| **Admin** | Organisation | Employee | `company` | FK | ✗ Employee has no `company` FK |

---

## Gap Summary

| Area | New Models Needed | Field / Link Additions |
|---|---|---|
| CRM | Lead, Client (entire module) | — |
| Project | — | `project` FK on Job, Asset, Inspection (currently in `operations`) |
| Manpower | Levy | Employee→Job assignment link |
| Admin | — | `site` FK on Project; `company` FK on Employee |

---

## Module Map

| Service | Key Models |
|---|---|
| `auth` | Tenant, User, PermissionGroup |
| `organisation` | Company, Department, Team, Position, Site, Client (billing) |
| `hr` | Employee, LeaveType, LeaveBalance, LeaveApplication, Attendance, Certification, WorkSchedule, StaffDeployment, PublicHoliday, ManpowerSettings |
| `projects` | Project, Task, TaskPhoto, TaskDocument, TaskComment, ProjectComment |
| `finance` | Quotation, QuotationItem, Invoice, InvoiceItem, DeliveryOrder, DeliveryOrderItem, Expense, Payment |
| `crm` | Client (pipeline), Contact, Lead, Interaction |
| `operations` | Job, WTSRequest, Asset, Inspection |
| `compliance` | Licence, Incident |
| `notifications` | Notification |
| `dashboard` | Aggregate read-only (no models) |

> `organisation.Client` ≠ `crm.Client` — org Client is a billing/finance record; crm Client is the full sales pipeline record.
