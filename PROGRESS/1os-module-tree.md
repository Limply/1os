# 1OS — One Operating System
## Module & Sub-Module Tree

> **Platform:** Multi-tenant SaaS | **Stack:** Django + DRF + React + Vite | **Pilot Tenant:** Astronic Services & Trading Pte Ltd

---

## 🏗️ Platform Layer

### AUTH
- Login / Logout
- JWT Token Management
- Refresh Token
- Password Reset
- Multi-Factor Authentication (MFA)
- OAuth2 (Google, Microsoft)
- Session Management

### TENANT MANAGEMENT
- Tenant Registration
- Tenant Settings (branding, timezone, currency)
- Schema Management (django-tenants)
- Subscription Plan (Starter / Business / Enterprise)
- Module Toggle (enable/disable per tenant)
- Billing & Invoicing (platform-level)

### USER MANAGEMENT
- User Profiles
- Role Definitions (Super Admin, Admin, Manager, Staff, Viewer)
- Permission Groups
- Invite / Onboard Users
- Deactivate / Offboard Users

---

## 🏢 ORGANISATION Module

### Company
- Company Profile
- Registered Address
- UEN / Business Registration
- Logos & Branding

### Structure
- Departments
- Teams
- Positions / Job Titles
- Reporting Lines

### Locations
- Office / Branch / Site
- GPS Coordinates
- Site Contacts

---

## 👥 HR Module

### Recruitment
- Job Postings
- Applicant Tracking
- Interview Scheduling
- Offer Letters

### Employee
- Employee Profiles
- Employment Contracts
- Emergency Contacts
- Document Vault (NRIC, certs, MOM pass)

### Attendance
- Clock In / Clock Out
- Timesheet
- Overtime Tracking
- Work Schedule / Shift Management

### Leave
- Leave Types (Annual, MC, Unpaid, etc.)
- Leave Application
- Approval Workflow
- Leave Balance Tracker
- Public Holiday Calendar (Singapore)

### Payroll
- Salary Structure
- CPF Contribution
- Claims & Reimbursements
- Payslip Generation
- IR8A / Tax Filing

### Performance
- KPI Setting
- Appraisal Cycles
- Performance Reviews
- Goal Tracking

### Training & Certification
- Course Registry
- Training Records
- Certification Tracking
- Expiry Alerts (BizSAFE, LEW, SSCET, etc.)

---

## ⚙️ OPERATIONS Module

### Job Management
- Job Cards
- Job Assignment
- Job Status (Draft → Assigned → In Progress → Completed)
- Job Types (Installation, Maintenance, Repair, Inspection)
- Priority Levels
- Site Instructions / Remarks

### Scheduling
- Calendar View (daily / weekly / monthly)
- Technician Availability
- Drag-and-Drop Scheduling
- Conflict Detection

### Weight Test Scheduling (WTS) *(Astronic-specific)*
- Test Request Creation
- Weight Delivery Scheduling
- Geo-Tracking (Leaflet + GPS)
- Delivery Status
- Telegram Bot Notifications
- Test Completion Sign-off

### Inspection
- Inspection Checklists
- Pass / Fail Records
- Photo Uploads
- Inspector Sign-off
- Regulatory Report Generation

### Asset Management
- Equipment Registry
- Tool Tracking
- Vehicle Fleet
- Maintenance Schedule
- Breakdown Reports

### Inventory
- Parts & Consumables
- Stock In / Out
- Low Stock Alerts
- Supplier Registry
- Purchase Requests

### Site Management
- Site Registry
- Site Contacts
- Site Documents
- Site History / Audit Trail

---

## 💰 FINANCE Module

### Quotations
- Quotation Builder (BOQ)
- Line Items (labour, materials, markup)
- PDF Generation
- Send to Client
- Quotation Status (Draft → Sent → Accepted → Rejected)
- Revision Tracking

### Invoicing
- Invoice Generation from Quotation
- Payment Terms
- Payment Status (Unpaid / Partial / Paid)
- Overdue Alerts
- GST Handling (9%)

### Expenses & Claims
- Expense Submission
- Receipt Upload
- Approval Workflow
- Reimbursement Tracking

### Financial Dashboard
- Revenue Summary
- Outstanding Invoices
- Monthly P&L (basic)
- Top Clients by Revenue

---

## 📋 COMPLIANCE Module

### Licence Registry
- Licence Types (BCA CRS, SPF LSSP, LEW, BizSAFE, etc.)
- Expiry Dates
- Renewal Reminders
- Document Uploads

### Regulatory Calendar
- MOM Inspection Dates
- BCA Submission Deadlines
- Permit Expiry
- Audit Schedule

### Incident Reporting
- Incident Types (injury, near-miss, property damage)
- Incident Reports
- Investigation Records
- Corrective Actions

---

## 🔔 NOTIFICATIONS Module

### Channels
- In-App Notifications
- Email (SMTP)
- Telegram Bot
- SMS (future)

### Triggers
- Job Assignment
- Leave Approval / Rejection
- Licence Expiry (30 / 14 / 7 days)
- Overdue Invoice
- WTS Delivery Status
- Inspection Due

### Notification Log
- Sent History
- Read / Unread Status
- Retry Failed

---

## 📊 DASHBOARD Module

### Overview
- Active Jobs Count
- Staff On-Site
- Pending Approvals
- Revenue MTD

### Operations Dashboard
- Job Status Breakdown
- Technician Utilisation
- Site Map (Leaflet)

### HR Dashboard
- Headcount
- Leave Summary
- Attendance Rate
- Upcoming Contract Expiry

### Finance Dashboard
- Revenue vs Target
- Accounts Receivable
- Top Pending Quotations

### Compliance Dashboard
- Licences Expiring Soon
- Overdue Inspections
- Open Incidents

---

## 📁 DOCUMENTS Module

### File Storage
- Upload / Download
- Folder Structure (per job, per employee, per site)
- Version Control

### Templates
- Quotation Templates
- Contract Templates
- Report Templates
- Letter Templates

---

## 🔧 SETTINGS Module (per tenant)

### General
- Company Info
- Timezone / Currency / Language
- Logo & Branding

### Modules
- Enable / Disable Modules
- Module Configuration

### Integrations
- AppSheet Connector
- Google Sheets Sync
- Telegram Bot Config
- WireGuard VPN (CondoWatch)
- Ollama AI (local inference)

### Audit Log
- User Activity Log
- Data Change History
- Login History

---

## 🧱 SHARED / PLATFORM SERVICES

| Service | Description |
|---|---|
| `shared/models` | BaseModel (created_at, updated_at, tenant) |
| `shared/utils` | PDF gen, email, Telegram helpers |
| `shared/middleware` | Tenant detection, JWT validation |
| `shared/permissions` | Role-based permission classes |
| `gateway/` | Nginx config, routing rules |

---

## 🗺️ Development Roadmap

| Phase | Modules | Status |
|---|---|---|
| v0.1 | Auth, Organisation, User Management | 🔲 Planned |
| v0.2 | Operations (Jobs, Scheduling, WTS) | 🔲 Planned |
| v0.3 | HR (Employee, Leave, Attendance) | 🔲 Planned |
| v0.4 | Finance (Quotations, Invoicing) | 🔲 Planned |
| v0.5 | Compliance, Notifications | 🔲 Planned |
| v0.6 | Dashboard, Documents | 🔲 Planned |
| v1.0 | Multi-tenant, Billing, Public Launch | 🔲 Planned |

---

*Generated: 2026-05-23 | Platform: 1OS by Simply Engineering Pte Ltd*
