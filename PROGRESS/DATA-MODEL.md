# 1OS — Data Model Design
**Purpose:** Cross-module relationships, naming conventions, and decoupling rules.
**Last Updated:** 2026-06-27

> This doc = **how entities connect** (relationships + rules). For exact field lists see `models.py`
> (source of truth); for the module/feature overview see `1os-module-tree.md`.

---

## Link legend

| Mark | Meaning |
|---|---|
| **FK** | ForeignKey, hard link, **same service** |
| **FK✱** | ForeignKey **across services** — only allowed for the exceptions below |
| **ref** | Loose string reference (`project_no`, `client_name`) — no DB constraint |
| **uuid[]** | JSON list of UUIDs (loose, no constraint) |

---

## Field Naming Convention

| Type | Rule | Example |
|---|---|---|
| ForeignKey | Model name in snake_case — **no `_id` suffix** | `quotation`, `invoice`, `project`, `task`, `site` |
| User / person FK | Role-based name | `prepared_by`, `assigned_to`, `uploaded_by`, `author`, `supervisor`, `recorded_by` |
| Loose string ref | Descriptive with `_no` / `_name` | `project_no`, `client_name`, `invoice_no`, `do_no` |
| Status | Always just `status` | `status` |
| Dates | `_date` suffix | `issue_date`, `due_date`, `join_date` |
| Amounts | Descriptive | `subtotal`, `gst_amount`, `total`, `unit_price`, `paid_amount` |
| Document numbers | `_no` suffix | `quote_no`, `invoice_no`, `do_no`, `job_no`, `project_no` |

> Schema diagrams may use `quotation_id` etc. as conceptual notation only. Actual Django FK fields never carry `_id`.

---

## Decoupling Rule

| Scope | Link method |
|---|---|
| Within same service | **FK** (hard link) |
| Cross-service | **ref** (`project_no`, `client_name`) or generic `ref_type` + `ref_id` |
| Allowed cross-service **FK✱** | `accounts.User`, `organisation.Site` |

**Cross-service FK✱ exceptions that exist in practice (beyond User/Site):**

| FK✱ | From → To | Why it's a hard link |
|---|---|---|
| `hr.Attendance.project` | hr → projects.Project | clock-in tied to a live project |
| `compliance.Licence.holder` | compliance → hr.Employee | individual licences belong to a person |
| `operations.ServiceJob.client` | operations → organisation.Client | service report needs a real client (PROTECT) |
| `crm.Contact.client`, `crm.Lead.client` | crm → organisation.Client | CRM pipeline hangs off the unified Client |

> ⚠️ Decision needed: either bless these as named exceptions (current state) or refactor to `ref`.
> The original "User + Site only" rule no longer matches the code.

---

## Cross-Module Relationship Map

### Finance (`finance`)
| Model | Links to | Field | Link |
|---|---|---|---|
| Quotation | QuotationItem | `quotation` | FK |
| Quotation | organisation.Site | `site` | FK✱ |
| Quotation | accounts.User | `prepared_by` | FK✱ |
| Quotation | Project | `project_no` | ref |
| Invoice | Quotation | `quotation` | FK (optional) |
| Invoice | InvoiceItem | `invoice` | FK |
| Invoice | Project | `project_no` | ref |
| DeliveryOrder | Quotation / Invoice | `quotation` / `invoice` | FK (optional) |
| DeliveryOrder | DeliveryOrderItem | `delivery_order` | FK |
| Expense | Project | `project_no` | ref |
| Payment | Invoice **or** Quotation | `invoice` / `quotation` | FK (optional, either) |
| Payment | Project | `project_no` | ref |

### Projects (`projects`)
| Model | Links to | Field | Link |
|---|---|---|---|
| Project | Task | `project` | FK |
| Project | ProjectComment / DailyReport / WSHPhoto | `project` | FK |
| Project | accounts.User | `manager`, `supervisor` | FK✱ |
| Task | TaskPhoto / TaskDocument / TaskComment | `task` | FK |
| Task | accounts.User | `assigned_to` | FK✱ |
| Project | Job / Asset / Inspection | — | **none** (operations has no Project link) |

### HR (`hr`)
| Model | Links to | Field | Link |
|---|---|---|---|
| Employee | accounts.User | `user` (1:1) | FK✱ |
| Employee | Department / Position | `department` / `position` | FK✱ |
| Employee | Employee (self) | `manager` (supervisor) | FK |
| LeaveBalance / LeaveApplication | Employee + LeaveType | `employee`, `leave_type` | FK |
| Attendance | Employee | `employee` | FK |
| Attendance | **projects.Project** | `project` | **FK✱** |
| Certification / WorkSchedule / StaffDeployment | Employee | `employee` | FK |
| PersonalGoal | accounts.User | `user` | FK✱ |
| Claim | accounts.User | `claimant`, `approver`, `reviewed_by` | FK✱ |
| ClaimItem | Claim | `claim` | FK |
| ClaimItem | Project | `project_no` | ref |
| ClaimAttachment | ClaimItem | `item` | FK |

### Operations (`operations`)
| Model | Links to | Field | Link |
|---|---|---|---|
| Job | organisation.Site | `site` | FK✱ |
| Job | users assigned | `assigned_to` | uuid[] |
| WTSRequest | Job / Site / driver | `job`, `site`, `driver` | FK / FK✱ |
| Asset | User / Site | `assigned_to`, `location` | FK✱ |
| Inspection | Job / Site / inspector | `job`, `site`, `inspector` | FK / FK✱ |
| ServiceJob | organisation.Client | `client` | FK✱ (PROTECT) |
| ServiceJob | Site / creator | `site`, `created_by` | FK✱ |
| ServiceReportItem | ServiceJob | `job` | FK |
| ServiceReportPhoto | ServiceReportItem | `item` | FK |
| InvoiceLineItem | ServiceJob | `job` | FK |

### CRM (`crm`)
| Model | Links to | Field | Link |
|---|---|---|---|
| Contact | organisation.Client | `client` | FK✱ |
| Lead | organisation.Client | `client` | FK✱ |
| Lead | accounts.User | `assigned_to` | FK✱ |
| Interaction | Lead | `lead` | FK |
| Interaction | accounts.User | `by` | FK✱ |

### Organisation (`organisation`)
| Model | Links to | Field | Link |
|---|---|---|---|
| Department | Department (self) / head | `parent`, `head` | FK / FK✱ |
| Team | Department / lead | `department`, `lead` | FK / FK✱ |
| Position | Department | `department` | FK |

### Compliance (`compliance`)
| Model | Links to | Field | Link |
|---|---|---|---|
| Licence | **hr.Employee** | `holder` | **FK✱** |
| Incident | organisation.Site | `site` | FK✱ |
| Incident | accounts.User | `reported_by` | FK✱ |
| Incident | employees involved | `involved` | uuid[] |

---

## Open gaps / decisions

| Area | Gap |
|---|---|
| Project ↔ Operations | Job/Asset/Inspection have **no** Project link (not even `project_no`) — orphaned from project tracking |
| Cross-service FK✱ | Decide: formalise the 4 non-standard FK✱ exceptions above, or refactor to `ref` |
| Site ↔ Project | Project has no `site` FK (uses free-text `site_address` + lat/lng) |
| Employee ↔ Company | Employee has no `company` FK (only `department`/`position`) |
| Job assignment | `Job.assigned_to` / `Incident.involved` are uuid[] JSON, not FK — no integrity / reverse lookup |

---

## Module Map (current)

| Service | Key Models |
|---|---|
| `auth` (label `accounts`) | Tenant, User |
| `organisation` | Company, Department, Team, Position, Site, Client |
| `hr` | Employee, LeaveType, LeaveBalance, LeaveApplication, Attendance, Certification, WorkSchedule, StaffDeployment, PublicHoliday, ManpowerSettings, PersonalGoal, Claim, ClaimItem, ClaimAttachment |
| `projects` | Project, Task, TaskPhoto, TaskDocument, TaskComment, ProjectComment, DailyReport, WSHPhoto |
| `finance` | Quotation, QuotationItem, Invoice, InvoiceItem, DeliveryOrder, DeliveryOrderItem, Expense, Payment |
| `crm` | Contact, Lead, Interaction |
| `operations` | Job, WTSRequest, Asset, Inspection, ServiceJob, ServiceReportItem, ServiceReportPhoto, InvoiceLineItem |
| `compliance` | Licence, Incident |
| `notifications` | Notification |
| `dashboard` | Aggregate read-only (no models) |

> **There is no `crm.Client`.** Client was unified into `organisation.Client`; CRM's Contact/Lead reference it by FK✱.
