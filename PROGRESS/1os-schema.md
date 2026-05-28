# 1OS — Database Schema Reference
## All Services: Field Lists (JSON + Table)

> **Convention:** All models inherit `BaseModel` (id, tenant_id, created_at, updated_at, is_active)
> **Primary Key:** UUID | **Tenant:** Always scoped | **Updated:** 2026-05-23

---

## SHARED — BaseModel (inherited by all)

```json
{
  "model": "BaseModel",
  "fields": [
    {"name": "id",         "type": "UUID",     "required": true,  "notes": "auto-generated, PK"},
    {"name": "tenant_id",  "type": "UUID",     "required": true,  "notes": "FK→Tenant, always filter by this"},
    {"name": "created_at", "type": "datetime", "required": true,  "notes": "auto"},
    {"name": "updated_at", "type": "datetime", "required": true,  "notes": "auto"},
    {"name": "is_active",  "type": "boolean",  "required": true,  "default": true}
  ]
}
```

---

## SERVICE: AUTH

### Model: Tenant
```json
{
  "model": "Tenant",
  "fields": [
    {"name": "id",            "type": "UUID",    "required": true},
    {"name": "name",          "type": "string",  "max_length": 255, "required": true},
    {"name": "schema_name",   "type": "string",  "max_length": 100, "required": true, "unique": true},
    {"name": "domain",        "type": "string",  "max_length": 255, "required": true, "unique": true},
    {"name": "plan",          "type": "choice",  "choices": ["starter","business","enterprise"], "default": "starter"},
    {"name": "modules",       "type": "json",    "required": false, "notes": "enabled module list"},
    {"name": "created_at",    "type": "datetime","required": true,  "notes": "auto"}
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | yes | PK |
| name | string(255) | yes | Company name |
| schema_name | string(100) | yes | unique, postgres schema |
| domain | string(255) | yes | unique, e.g. astronic |
| plan | choice | yes | starter/business/enterprise |
| modules | json | no | enabled modules list |
| created_at | datetime | yes | auto |

---

### Model: User
```json
{
  "model": "User",
  "fields": [
    {"name": "id",           "type": "UUID",    "required": true},
    {"name": "tenant_id",    "type": "UUID",    "required": true,  "notes": "FK→Tenant"},
    {"name": "email",        "type": "email",   "required": true,  "unique": true},
    {"name": "password",     "type": "string",  "required": true,  "notes": "hashed"},
    {"name": "first_name",   "type": "string",  "max_length": 100, "required": true},
    {"name": "last_name",    "type": "string",  "max_length": 100, "required": true},
    {"name": "role",         "type": "choice",  "choices": ["superadmin","admin","manager","staff","viewer"]},
    {"name": "is_active",    "type": "boolean", "default": true},
    {"name": "last_login",   "type": "datetime","required": false},
    {"name": "mfa_enabled",  "type": "boolean", "default": false},
    {"name": "avatar",       "type": "string",  "required": false, "notes": "file path"}
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | yes | PK |
| tenant_id | UUID | yes | FK→Tenant |
| email | email | yes | unique |
| password | string | yes | hashed |
| first_name | string(100) | yes | |
| last_name | string(100) | yes | |
| role | choice | yes | superadmin/admin/manager/staff/viewer |
| is_active | boolean | yes | default true |
| last_login | datetime | no | |
| mfa_enabled | boolean | yes | default false |
| avatar | string | no | file path |

---

### Model: PermissionGroup
```json
{
  "model": "PermissionGroup",
  "fields": [
    {"name": "id",          "type": "UUID",   "required": true},
    {"name": "tenant_id",   "type": "UUID",   "required": true},
    {"name": "name",        "type": "string", "max_length": 100, "required": true},
    {"name": "permissions", "type": "json",   "required": true,  "notes": "list of permission strings"}
  ]
}
```

---

## SERVICE: ORGANISATION

### Model: Company
```json
{
  "model": "Company",
  "fields": [
    {"name": "id",              "type": "UUID",   "required": true},
    {"name": "tenant_id",       "type": "UUID",   "required": true},
    {"name": "name",            "type": "string", "max_length": 255, "required": true},
    {"name": "uen",             "type": "string", "max_length": 20,  "required": false, "notes": "Singapore UEN"},
    {"name": "address",         "type": "text",   "required": false},
    {"name": "postal_code",     "type": "string", "max_length": 10,  "required": false},
    {"name": "phone",           "type": "string", "max_length": 20,  "required": false},
    {"name": "email",           "type": "email",  "required": false},
    {"name": "website",         "type": "url",    "required": false},
    {"name": "logo",            "type": "string", "required": false, "notes": "file path"},
    {"name": "gst_registered",  "type": "boolean","default": false},
    {"name": "gst_number",      "type": "string", "max_length": 20,  "required": false}
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | yes | PK |
| tenant_id | UUID | yes | FK→Tenant |
| name | string(255) | yes | |
| uen | string(20) | no | Singapore UEN |
| address | text | no | |
| postal_code | string(10) | no | |
| phone | string(20) | no | |
| email | email | no | |
| website | url | no | |
| logo | string | no | file path |
| gst_registered | boolean | yes | default false |
| gst_number | string(20) | no | |

---

### Model: Department
```json
{
  "model": "Department",
  "fields": [
    {"name": "id",          "type": "UUID",   "required": true},
    {"name": "tenant_id",   "type": "UUID",   "required": true},
    {"name": "name",        "type": "string", "max_length": 100, "required": true},
    {"name": "code",        "type": "string", "max_length": 20,  "required": false},
    {"name": "parent",      "type": "UUID",   "required": false, "notes": "FK→Department (self), for nested depts"},
    {"name": "head",        "type": "UUID",   "required": false, "notes": "FK→User"}
  ]
}
```

---

### Model: Team
```json
{
  "model": "Team",
  "fields": [
    {"name": "id",           "type": "UUID",   "required": true},
    {"name": "tenant_id",    "type": "UUID",   "required": true},
    {"name": "name",         "type": "string", "max_length": 100, "required": true},
    {"name": "department_id","type": "UUID",   "required": true,  "notes": "FK→Department"},
    {"name": "lead",         "type": "UUID",   "required": false, "notes": "FK→User"}
  ]
}
```

---

### Model: Position
```json
{
  "model": "Position",
  "fields": [
    {"name": "id",           "type": "UUID",   "required": true},
    {"name": "tenant_id",    "type": "UUID",   "required": true},
    {"name": "title",        "type": "string", "max_length": 100, "required": true},
    {"name": "department_id","type": "UUID",   "required": false, "notes": "FK→Department"},
    {"name": "level",        "type": "integer","required": false, "notes": "seniority level 1-10"}
  ]
}
```

---

### Model: Site (Location)
```json
{
  "model": "Site",
  "fields": [
    {"name": "id",          "type": "UUID",   "required": true},
    {"name": "tenant_id",   "type": "UUID",   "required": true},
    {"name": "name",        "type": "string", "max_length": 255, "required": true},
    {"name": "type",        "type": "choice", "choices": ["office","branch","client_site","warehouse"]},
    {"name": "address",     "type": "text",   "required": false},
    {"name": "postal_code", "type": "string", "max_length": 10,  "required": false},
    {"name": "lat",         "type": "decimal","required": false, "notes": "latitude"},
    {"name": "lng",         "type": "decimal","required": false, "notes": "longitude"},
    {"name": "contact_name","type": "string", "max_length": 100, "required": false},
    {"name": "contact_phone","type": "string","max_length": 20,  "required": false},
    {"name": "notes",       "type": "text",   "required": false}
  ]
}
```

---

## SERVICE: HR

### Model: Employee
```json
{
  "model": "Employee",
  "fields": [
    {"name": "id",              "type": "UUID",    "required": true},
    {"name": "tenant_id",       "type": "UUID",    "required": true},
    {"name": "user_id",         "type": "UUID",    "required": false, "notes": "FK→User, if has system access"},
    {"name": "emp_no",          "type": "string",  "max_length": 20,  "required": true, "unique": true},
    {"name": "first_name",      "type": "string",  "max_length": 100, "required": true},
    {"name": "last_name",       "type": "string",  "max_length": 100, "required": true},
    {"name": "nric",            "type": "string",  "max_length": 20,  "required": false, "notes": "encrypted"},
    {"name": "nationality",     "type": "string",  "max_length": 50,  "required": false},
    {"name": "pass_type",       "type": "choice",  "choices": ["citizen","pr","ep","sp","wp","other"]},
    {"name": "pass_expiry",     "type": "date",    "required": false},
    {"name": "email",           "type": "email",   "required": true},
    {"name": "phone",           "type": "string",  "max_length": 20,  "required": false},
    {"name": "department_id",   "type": "UUID",    "required": false, "notes": "FK→Department"},
    {"name": "position_id",     "type": "UUID",    "required": false, "notes": "FK→Position"},
    {"name": "join_date",       "type": "date",    "required": true},
    {"name": "end_date",        "type": "date",    "required": false},
    {"name": "employment_type", "type": "choice",  "choices": ["fulltime","parttime","contract","intern"]},
    {"name": "basic_salary",    "type": "decimal", "required": false},
    {"name": "emergency_name",  "type": "string",  "max_length": 100, "required": false},
    {"name": "emergency_phone", "type": "string",  "max_length": 20,  "required": false}
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | yes | PK |
| emp_no | string(20) | yes | unique |
| first_name | string(100) | yes | |
| last_name | string(100) | yes | |
| nric | string(20) | no | encrypted |
| pass_type | choice | no | citizen/pr/ep/sp/wp |
| pass_expiry | date | no | |
| email | email | yes | |
| department_id | UUID | no | FK→Department |
| position_id | UUID | no | FK→Position |
| join_date | date | yes | |
| employment_type | choice | yes | fulltime/parttime/contract/intern |
| basic_salary | decimal | no | |

---

### Model: LeaveType
```json
{
  "model": "LeaveType",
  "fields": [
    {"name": "id",           "type": "UUID",    "required": true},
    {"name": "tenant_id",    "type": "UUID",    "required": true},
    {"name": "name",         "type": "string",  "max_length": 100, "required": true},
    {"name": "days_per_year","type": "decimal", "required": true},
    {"name": "paid",         "type": "boolean", "default": true},
    {"name": "carry_forward","type": "boolean", "default": false},
    {"name": "max_carry",    "type": "integer", "required": false}
  ]
}
```

---

### Model: LeaveApplication
```json
{
  "model": "LeaveApplication",
  "fields": [
    {"name": "id",             "type": "UUID",   "required": true},
    {"name": "tenant_id",      "type": "UUID",   "required": true},
    {"name": "employee_id",    "type": "UUID",   "required": true,  "notes": "FK→Employee"},
    {"name": "leave_type_id",  "type": "UUID",   "required": true,  "notes": "FK→LeaveType"},
    {"name": "start_date",     "type": "date",   "required": true},
    {"name": "end_date",       "type": "date",   "required": true},
    {"name": "days",           "type": "decimal","required": true,  "notes": "calculated"},
    {"name": "reason",         "type": "text",   "required": false},
    {"name": "status",         "type": "choice", "choices": ["pending","approved","rejected","cancelled"]},
    {"name": "approved_by",    "type": "UUID",   "required": false, "notes": "FK→User"},
    {"name": "approved_at",    "type": "datetime","required": false},
    {"name": "remarks",        "type": "text",   "required": false}
  ]
}
```

---

### Model: Attendance
```json
{
  "model": "Attendance",
  "fields": [
    {"name": "id",          "type": "UUID",    "required": true},
    {"name": "tenant_id",   "type": "UUID",    "required": true},
    {"name": "employee_id", "type": "UUID",    "required": true,  "notes": "FK→Employee"},
    {"name": "date",        "type": "date",    "required": true},
    {"name": "clock_in",    "type": "datetime","required": false},
    {"name": "clock_out",   "type": "datetime","required": false},
    {"name": "hours",       "type": "decimal", "required": false, "notes": "calculated"},
    {"name": "overtime",    "type": "decimal", "required": false, "notes": "hours over standard"},
    {"name": "status",      "type": "choice",  "choices": ["present","absent","late","half_day","leave"]},
    {"name": "notes",       "type": "text",    "required": false}
  ]
}
```

---

### Model: Certification
```json
{
  "model": "Certification",
  "fields": [
    {"name": "id",           "type": "UUID",   "required": true},
    {"name": "tenant_id",    "type": "UUID",   "required": true},
    {"name": "employee_id",  "type": "UUID",   "required": true,  "notes": "FK→Employee"},
    {"name": "name",         "type": "string", "max_length": 255, "required": true},
    {"name": "issuer",       "type": "string", "max_length": 255, "required": false},
    {"name": "cert_number",  "type": "string", "max_length": 100, "required": false},
    {"name": "issue_date",   "type": "date",   "required": false},
    {"name": "expiry_date",  "type": "date",   "required": false},
    {"name": "document",     "type": "string", "required": false, "notes": "file path"},
    {"name": "alert_days",   "type": "integer","default": 30,     "notes": "days before expiry to alert"}
  ]
}
```

---

## SERVICE: OPERATIONS

### Model: Job
```json
{
  "model": "Job",
  "fields": [
    {"name": "id",           "type": "UUID",   "required": true},
    {"name": "tenant_id",    "type": "UUID",   "required": true},
    {"name": "job_no",       "type": "string", "max_length": 20,  "required": true, "unique": true},
    {"name": "title",        "type": "string", "max_length": 255, "required": true},
    {"name": "type",         "type": "choice", "choices": ["installation","maintenance","repair","inspection","wts"]},
    {"name": "status",       "type": "choice", "choices": ["draft","assigned","in_progress","completed","cancelled"]},
    {"name": "priority",     "type": "choice", "choices": ["low","medium","high","urgent"]},
    {"name": "site_id",      "type": "UUID",   "required": false, "notes": "FK→Site"},
    {"name": "client_name",  "type": "string", "max_length": 255, "required": false},
    {"name": "client_contact","type": "string","max_length": 20,  "required": false},
    {"name": "assigned_to",  "type": "json",   "required": false, "notes": "list of FK→User"},
    {"name": "scheduled_date","type": "date",  "required": false},
    {"name": "start_time",   "type": "time",   "required": false},
    {"name": "end_time",     "type": "time",   "required": false},
    {"name": "instructions", "type": "text",   "required": false},
    {"name": "remarks",      "type": "text",   "required": false},
    {"name": "completed_at", "type": "datetime","required": false}
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | yes | PK |
| job_no | string(20) | yes | unique, auto-generate |
| title | string(255) | yes | |
| type | choice | yes | installation/maintenance/repair/inspection/wts |
| status | choice | yes | draft→assigned→in_progress→completed |
| priority | choice | yes | low/medium/high/urgent |
| site_id | UUID | no | FK→Site |
| assigned_to | json | no | list of user IDs |
| scheduled_date | date | no | |
| instructions | text | no | |

---

### Model: WTSRequest (Weight Test Scheduling)
```json
{
  "model": "WTSRequest",
  "fields": [
    {"name": "id",              "type": "UUID",    "required": true},
    {"name": "tenant_id",       "type": "UUID",    "required": true},
    {"name": "job_id",          "type": "UUID",    "required": false, "notes": "FK→Job"},
    {"name": "ref_no",          "type": "string",  "max_length": 20,  "required": true, "unique": true},
    {"name": "site_id",         "type": "UUID",    "required": true,  "notes": "FK→Site"},
    {"name": "lift_no",         "type": "string",  "max_length": 50,  "required": false},
    {"name": "test_date",       "type": "date",    "required": true},
    {"name": "test_time",       "type": "time",    "required": false},
    {"name": "weight_kg",       "type": "decimal", "required": false},
    {"name": "delivery_status", "type": "choice",  "choices": ["pending","in_transit","delivered","returned"]},
    {"name": "driver_id",       "type": "UUID",    "required": false, "notes": "FK→User"},
    {"name": "current_lat",     "type": "decimal", "required": false, "notes": "live GPS"},
    {"name": "current_lng",     "type": "decimal", "required": false, "notes": "live GPS"},
    {"name": "signoff_by",      "type": "string",  "max_length": 100, "required": false},
    {"name": "signoff_at",      "type": "datetime","required": false},
    {"name": "result",          "type": "choice",  "choices": ["pass","fail","pending"]}
  ]
}
```

---

### Model: Asset
```json
{
  "model": "Asset",
  "fields": [
    {"name": "id",           "type": "UUID",   "required": true},
    {"name": "tenant_id",    "type": "UUID",   "required": true},
    {"name": "name",         "type": "string", "max_length": 255, "required": true},
    {"name": "type",         "type": "choice", "choices": ["equipment","tool","vehicle","it"]},
    {"name": "serial_no",    "type": "string", "max_length": 100, "required": false},
    {"name": "model",        "type": "string", "max_length": 100, "required": false},
    {"name": "brand",        "type": "string", "max_length": 100, "required": false},
    {"name": "status",       "type": "choice", "choices": ["available","in_use","maintenance","retired"]},
    {"name": "assigned_to",  "type": "UUID",   "required": false, "notes": "FK→User"},
    {"name": "location_id",  "type": "UUID",   "required": false, "notes": "FK→Site"},
    {"name": "purchase_date","type": "date",   "required": false},
    {"name": "warranty_expiry","type": "date", "required": false},
    {"name": "next_service", "type": "date",   "required": false}
  ]
}
```

---

### Model: Inspection
```json
{
  "model": "Inspection",
  "fields": [
    {"name": "id",           "type": "UUID",   "required": true},
    {"name": "tenant_id",    "type": "UUID",   "required": true},
    {"name": "job_id",       "type": "UUID",   "required": false, "notes": "FK→Job"},
    {"name": "site_id",      "type": "UUID",   "required": true,  "notes": "FK→Site"},
    {"name": "type",         "type": "string", "max_length": 100, "required": true, "notes": "e.g. Lift Annual Inspection"},
    {"name": "inspector_id", "type": "UUID",   "required": false, "notes": "FK→User"},
    {"name": "date",         "type": "date",   "required": true},
    {"name": "result",       "type": "choice", "choices": ["pass","fail","conditional"]},
    {"name": "checklist",    "type": "json",   "required": false, "notes": "checklist items and results"},
    {"name": "photos",       "type": "json",   "required": false, "notes": "list of file paths"},
    {"name": "remarks",      "type": "text",   "required": false},
    {"name": "next_due",     "type": "date",   "required": false}
  ]
}
```

---

## SERVICE: FINANCE

### Model: Quotation
```json
{
  "model": "Quotation",
  "fields": [
    {"name": "id",           "type": "UUID",    "required": true},
    {"name": "tenant_id",    "type": "UUID",    "required": true},
    {"name": "quote_no",     "type": "string",  "max_length": 20,  "required": true, "unique": true},
    {"name": "client_name",  "type": "string",  "max_length": 255, "required": true},
    {"name": "client_email", "type": "email",   "required": false},
    {"name": "client_address","type": "text",   "required": false},
    {"name": "site_id",      "type": "UUID",    "required": false, "notes": "FK→Site"},
    {"name": "status",       "type": "choice",  "choices": ["draft","sent","accepted","rejected","expired"]},
    {"name": "issue_date",   "type": "date",    "required": true},
    {"name": "valid_until",  "type": "date",    "required": false},
    {"name": "subtotal",     "type": "decimal", "required": true,  "notes": "calculated"},
    {"name": "gst_amount",   "type": "decimal", "required": false, "notes": "9% GST"},
    {"name": "total",        "type": "decimal", "required": true,  "notes": "calculated"},
    {"name": "notes",        "type": "text",    "required": false},
    {"name": "prepared_by",  "type": "UUID",    "required": false, "notes": "FK→User"},
    {"name": "revision",     "type": "integer", "default": 1}
  ]
}
```

---

### Model: QuotationItem
```json
{
  "model": "QuotationItem",
  "fields": [
    {"name": "id",            "type": "UUID",    "required": true},
    {"name": "quotation_id",  "type": "UUID",    "required": true,  "notes": "FK→Quotation"},
    {"name": "description",   "type": "text",    "required": true},
    {"name": "unit",          "type": "string",  "max_length": 20,  "required": false, "notes": "e.g. lot, pcs, m"},
    {"name": "qty",           "type": "decimal", "required": true},
    {"name": "unit_price",    "type": "decimal", "required": true},
    {"name": "amount",        "type": "decimal", "required": true,  "notes": "calculated qty x unit_price"},
    {"name": "item_type",     "type": "choice",  "choices": ["supply","labour","material","misc"]},
    {"name": "sort_order",    "type": "integer", "required": false}
  ]
}
```

---

### Model: Invoice
```json
{
  "model": "Invoice",
  "fields": [
    {"name": "id",            "type": "UUID",    "required": true},
    {"name": "tenant_id",     "type": "UUID",    "required": true},
    {"name": "invoice_no",    "type": "string",  "max_length": 20,  "required": true, "unique": true},
    {"name": "quotation_id",  "type": "UUID",    "required": false, "notes": "FK→Quotation"},
    {"name": "client_name",   "type": "string",  "max_length": 255, "required": true},
    {"name": "client_email",  "type": "email",   "required": false},
    {"name": "status",        "type": "choice",  "choices": ["unpaid","partial","paid","overdue","void"]},
    {"name": "issue_date",    "type": "date",    "required": true},
    {"name": "due_date",      "type": "date",    "required": true},
    {"name": "subtotal",      "type": "decimal", "required": true},
    {"name": "gst_amount",    "type": "decimal", "required": false},
    {"name": "total",         "type": "decimal", "required": true},
    {"name": "paid_amount",   "type": "decimal", "default": 0},
    {"name": "paid_date",     "type": "date",    "required": false},
    {"name": "payment_method","type": "choice",  "choices": ["bank_transfer","cheque","cash","paynow"]},
    {"name": "notes",         "type": "text",    "required": false}
  ]
}
```

---

## SERVICE: COMPLIANCE

### Model: Licence
```json
{
  "model": "Licence",
  "fields": [
    {"name": "id",           "type": "UUID",   "required": true},
    {"name": "tenant_id",    "type": "UUID",   "required": true},
    {"name": "name",         "type": "string", "max_length": 255, "required": true, "notes": "e.g. BCA CRS ME11"},
    {"name": "type",         "type": "choice", "choices": ["company","individual"]},
    {"name": "holder_id",    "type": "UUID",   "required": false, "notes": "FK→Employee if individual"},
    {"name": "licence_no",   "type": "string", "max_length": 100, "required": false},
    {"name": "issuer",       "type": "string", "max_length": 100, "required": false, "notes": "BCA, SPF, MOM etc"},
    {"name": "issue_date",   "type": "date",   "required": false},
    {"name": "expiry_date",  "type": "date",   "required": false},
    {"name": "document",     "type": "string", "required": false, "notes": "file path"},
    {"name": "alert_days",   "type": "integer","default": 30},
    {"name": "status",       "type": "choice", "choices": ["active","expired","pending_renewal"]}
  ]
}
```

---

### Model: Incident
```json
{
  "model": "Incident",
  "fields": [
    {"name": "id",            "type": "UUID",   "required": true},
    {"name": "tenant_id",     "type": "UUID",   "required": true},
    {"name": "ref_no",        "type": "string", "max_length": 20,  "required": true},
    {"name": "type",          "type": "choice", "choices": ["injury","near_miss","property_damage","other"]},
    {"name": "severity",      "type": "choice", "choices": ["low","medium","high","critical"]},
    {"name": "site_id",       "type": "UUID",   "required": false, "notes": "FK→Site"},
    {"name": "date",          "type": "date",   "required": true},
    {"name": "description",   "type": "text",   "required": true},
    {"name": "involved",      "type": "json",   "required": false, "notes": "list of employee IDs"},
    {"name": "reported_by",   "type": "UUID",   "required": false, "notes": "FK→User"},
    {"name": "status",        "type": "choice", "choices": ["open","investigating","closed"]},
    {"name": "corrective_action","type": "text","required": false},
    {"name": "closed_at",     "type": "datetime","required": false}
  ]
}
```

---

## SERVICE: NOTIFICATIONS

### Model: Notification
```json
{
  "model": "Notification",
  "fields": [
    {"name": "id",          "type": "UUID",   "required": true},
    {"name": "tenant_id",   "type": "UUID",   "required": true},
    {"name": "recipient_id","type": "UUID",   "required": true,  "notes": "FK→User"},
    {"name": "channel",     "type": "choice", "choices": ["in_app","email","telegram","sms"]},
    {"name": "subject",     "type": "string", "max_length": 255, "required": false},
    {"name": "message",     "type": "text",   "required": true},
    {"name": "trigger",     "type": "string", "max_length": 100, "required": false, "notes": "e.g. job_assigned"},
    {"name": "ref_type",    "type": "string", "max_length": 50,  "required": false, "notes": "Job, Leave, Licence"},
    {"name": "ref_id",      "type": "UUID",   "required": false, "notes": "ID of related object"},
    {"name": "is_read",     "type": "boolean","default": false},
    {"name": "sent_at",     "type": "datetime","required": false},
    {"name": "read_at",     "type": "datetime","required": false},
    {"name": "status",      "type": "choice", "choices": ["pending","sent","failed"]}
  ]
}
```

---

## Field Type Reference

| Type | Django Field | Notes |
|---|---|---|
| UUID | `UUIDField` | default=uuid.uuid4 |
| string | `CharField` | specify max_length |
| text | `TextField` | no max_length |
| email | `EmailField` | validates format |
| url | `URLField` | validates format |
| integer | `IntegerField` | |
| decimal | `DecimalField` | max_digits=12, decimal_places=2 |
| boolean | `BooleanField` | |
| date | `DateField` | |
| time | `TimeField` | |
| datetime | `DateTimeField` | |
| choice | `CharField` with choices | |
| json | `JSONField` | Django 3.1+ |
| FK | `ForeignKey` | on_delete=SET_NULL or CASCADE |

---

## Model Count Summary

| Service | Models |
|---|---|
| auth | Tenant, User, PermissionGroup |
| organisation | Company, Department, Team, Position, Site |
| hr | Employee, LeaveType, LeaveApplication, Attendance, Certification |
| operations | Job, WTSRequest, Asset, Inspection |
| finance | Quotation, QuotationItem, Invoice |
| compliance | Licence, Incident |
| notifications | Notification |
| **Total** | **24 models** |

---

*1OS by Simply Engineering Pte Ltd — Schema Reference v1.0 | 2026-05-23*
