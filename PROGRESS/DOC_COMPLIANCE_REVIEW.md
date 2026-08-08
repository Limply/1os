# Doc-vs-Code Compliance Review

**Date:** 2026-07-16
**Scope:** Checked the rules documented in `DEVELOPMENT.md` (Decoupling Rule,
RBAC coverage table, Coding Rules, Error Display Rule, Git rule) against the
actual code in `/opt/1os` (prod, `main`). Triggered by the Supervisor Clock-In
bug found the same day — see `SUPERVISOR_CLOCKIN_BUG.md`.

This is a snapshot, not exhaustive — grep-based spot checks on the
highest-value rules, not a full audit of every file.

---

## 🔴 Not followed

### 1. Decoupling Rule — `crm` imports `organisation.Client` directly
`DEVELOPMENT.md` states services never import each other's models, and
separately documents "`org.Client` ≠ `crm.Client` — org.Client is for
finance/quotation linking; crm.Client is the full sales-pipeline record."

**Reality:** `services/crm/models.py` defines only `Contact`, `Lead`,
`Interaction` — **there is no `crm.Client` model.** `crm/views.py` and
`crm/serializers.py` both do `from services.organisation.models import Client`
and `ClientViewSet` (mounted at `/api/crm/clients/`) operates directly on
`organisation.Client`.

So this is two problems at once: a live Decoupling Rule violation, **and** the
documentation describing a model that doesn't exist. Either the doc is stale
(the crm.Client split was planned but never built — CRM module was a stub as
of the last dev-guide pass) or a `crm.Client` model needs to be built and the
cross-import removed.

### 2. Error Display Rule — silent `.catch(() => {})` in 11 files (20 sites)
Rule: "never use a silent `.catch(() => {})`." Found in:
`Login.jsx`, `Calendar.jsx`, `Files.jsx`, `Settings.jsx`, `Personal.jsx`,
`Projects.jsx`, `Operations.jsx`, `Finance.jsx`, `ClaimsTab.jsx`,
`SupervisorDailyReport.jsx`, **`ClockInWidget.jsx`**.

The `ClockInWidget.jsx` instance is the direct cause of the Clock-In bug
being silent/undiagnosable from the UI (see `SUPERVISOR_CLOCKIN_BUG.md`) —
this isn't just a style nit, it hid a real bug.

### 3. Error Display Rule — `alert()` used in 3 files
Rule: "Do not use `alert()` or `console.error()` — inline red text only."
Found in `Schedules.jsx` (x2), `ClaimsTab.jsx` (x2), `ProjectDetail.jsx` (x1).

### 4. Decoupling Rule — minor violations in HR test/management code
`services/hr/tests.py` and
`services/hr/management/commands/import_astronic_employees.py` import
`services.auth.models.Tenant` and `services.organisation.models.{Position,Department}`
directly. The documented exception is `accounts.User` only (confirmed
`AUTH_USER_MODEL = 'accounts.User'` — auth's app label is `accounts`), not
`Tenant` or org models. Lower stakes than #1 (test/one-off command, not a
live API path) but technically out of policy.

---

## 🟢 Followed

- **RBAC class structure** — `shared/permissions.py`'s `P` constants,
  `ROLE_DEFAULT_PERMISSIONS`, `user_can()`, `make_module_permission()` all
  exist and match the documented shape. Per-service `*Permission` classes
  (`HRPermission`, `FinancePermission`, `OpsPermission`, `CompliancePermission`,
  `CRMPermission`, `OrgPermission`) are wired as documented.
- **Git discipline** — `/opt/1os` is clean on `main` (only an untracked,
  presumably-gitignored `backups/` dir), consistent with "never edit `/opt/1os/`
  directly" / deploy-via-pull.
- **Field naming convention** — spot-checked FK names (`quotation`, `invoice`,
  `project`, `task`, `employee`, `supervisor`) — no stray `_id`-suffixed FK
  fields found.

## ⚠️ Documentation gap (not a code bug, but worth fixing)

- **`position_level` tiering is undocumented.** `SupervisorLayout.jsx` gates
  Level-1 accounts to clock-in-only, but `DEVELOPMENT.md`'s Roles table only
  covers the `role`/`P`-permission system. Two independent access-control axes
  exist in the code; only one is written down. Recommend adding a short section
  to `DEVELOPMENT.md` alongside the Roles table.
- **RBAC ViewSet coverage table doesn't mention the `IsClockInAllowed`
  exception** on `AttendanceViewSet.clock_in`/`clock_out`, nor the fact that the
  supporting `Employee`/`WorkSchedule` GET calls those actions depend on are
  *not* covered by it — which is exactly the gap that caused the Clock-In bug.

---

## Suggested next steps (priority order)
1. Fix `SUPERVISOR_CLOCKIN_BUG.md` (blocks a real feature for real users).
2. Decide the `crm.Client` question — build it for real, or stop pretending it's
   separate from `organisation.Client` in the docs.
3. Sweep the 20 silent-catch sites using the existing Error Display Rule
   pattern (already defined in `DEVELOPMENT.md`) — mechanical, low-risk fix.
4. Replace the 5 `alert()` call sites with the same inline-error pattern.
5. Document `position_level` tiering next to the Roles table.
