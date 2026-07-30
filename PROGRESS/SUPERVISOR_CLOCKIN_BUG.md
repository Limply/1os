# Supervisor Portal — Clock-In Broken for Level-1 Worker Accounts

**Found:** 2026-07-16, role-play functional QA pass (Playwright, dev instance `:5173`/`:8001`)
**Severity:** 🔴 High — the one screen Level-1 accounts are allowed to use does not work
**Status:** ✅ Fixed 2026-07-24

---

## Summary

A Level-1 "Construction Worker" account (`user@sim-eng.com`, `position_level: 1`,
`permissions: ["supervisor.app"]`) cannot clock in through `/supervisor/clock-in`.
GPS capture and photo capture (with GPS/timestamp watermark) both work correctly,
but the **Clock In button stays permanently disabled** and the page always shows
"No schedule assigned for today."

## Root Cause

`ClockInWidget.jsx` resolves the logged-in user's `Employee` record via
`GET /api/hr/employees/?limit=999`. That call returns **403** for this account:

- `EmployeeViewSet` inherits `TenantScopedMixin.permission_classes = [HRPermission]`
  (`services/hr/views.py:44-56`) — gated on `HR_VIEW`/`HR_MANAGE`.
- `WorkScheduleViewSet` is gated the same way (`services/hr/views.py:339-340`).
- Only the `AttendanceViewSet.clock_in` / `clock_out` **actions** got the more
  permissive `IsClockInAllowed` override (`services/hr/views.py:154-155, 239-240`)
  — the surrounding reads needed to even reach the clock-in button were not.
- Effect: `employee` never resolves → `schedule` fetch (needs `employee.id`) never
  fires → `schedule` stays `null` → the button's
  `disabled={... || !schedule || ...}` can never clear, regardless of photo/GPS.
- This 403 fires on every mount, so it repeats on every redirect back to
  `/supervisor/clock-in` (Level-1 accounts get redirected here from every other
  supervisor route — see `SupervisorLayout.jsx`).

**Contributing factor:** `ClockInWidget.jsx` swallows the failing request in a
silent `.catch(() => {})`, so the user sees no error at all — just a permanently
greyed-out button. This is itself a violation of `DEVELOPMENT.md`'s documented
**Error Display Rule** ("every save/submit action must surface errors ... never
use a silent `.catch(() => {})`") — see `DOC_COMPLIANCE_REVIEW.md` for the wider
pattern.

## Fix Direction

Give Level-1/worker accounts read access to *their own* employee + today's
schedule record, without granting full HR module access:
- Widen `IsClockInAllowed` (or an equivalent) to cover the specific GET calls
  `ClockInWidget` needs, scoped to `request.user`'s own record, **or**
- Add a dedicated self-service endpoint (e.g. `/api/hr/employees/me/`,
  `/api/hr/work-schedules/mine/`) under that lighter permission, rather than
  routing through `EmployeeViewSet`/`WorkScheduleViewSet`'s class-level
  `HRPermission` gate.

Also fix the silent catch in `ClockInWidget.jsx` per the existing Error Display
Rule pattern, so future permission/data issues are visible instead of just a
dead button.

## Repro

1. Log into dev (`:5173`) as `user@sim-eng.com`.
2. Land on `/supervisor/clock-in` (Level-1 redirect).
3. Click "Get GPS Location" → succeeds (reverse-geocoded location shown).
4. Click "Open Camera" → "Take Photo" → preview with GPS/timestamp watermark shown correctly.
5. "Clock In" button remains disabled. Page shows "No schedule assigned for today."
6. Direct API check confirms: `GET /api/hr/employees/?limit=999` with this
   account's JWT → `403 {"detail":"You do not have permission to perform this action."}`.

## Doc Gap Noted

`DEVELOPMENT.md`'s Roles table (`viewer · staff · foreman · supervisor · manager
· admin · superadmin`) does not mention `position_level`-based tiering at all.
`SupervisorLayout.jsx` gates on `user.position_level === 1` to restrict to
clock-in only — a second, undocumented axis of access control layered on top
of the `role`/`P` permission system. Worth documenting alongside the Roles
table so this isn't rediscovered by accident again.

*Closed 2026-07-24 — position-level tiering is now documented in `DEVELOPMENT.md`
next to the Roles table.*

## Resolution (2026-07-24)

Fixed per the "Fix Direction" above (self-service endpoints, not a widened blanket permission):

- `GET /api/hr/employees/me/` — permission loosened from `HRPermission` to
  `IsAuthenticated` (already scoped to `request.user`, so this is safe;
  `services/hr/views.py:employee_me`).
- `GET /api/hr/work-schedules/mine/` — new self-service action, returns only the
  logged-in user's own schedule row for a given date (default today), under
  `IsAuthenticated` (`WorkScheduleViewSet.mine`).
- `GET /api/hr/attendance/mine/` — new self-service action, same pattern, for
  today's attendance record (`AttendanceViewSet.mine`). Needed because
  `AttendanceViewSet`'s plain `list` was *also* gated by `HRPermission` — the
  original repro only caught the `employees/` 403, but the attendance fetch had
  the identical problem.
- `ClockInWidget.jsx` now calls the three `mine`/`me` endpoints instead of the
  broad `HRPermission`-gated list endpoints, and the silent `.catch(() => {})`
  sites on these fetches now call `setMessage(...)` on failure instead of
  swallowing the error (partial fix of the Error Display Rule gap noted in
  `DOC_COMPLIANCE_REVIEW.md` — only the sites touched here, not the full sweep).
- Separately, clock-in no longer *requires* a `WorkSchedule` row to exist at all
  (schedule became optional per a same-day product request) — geofence/late
  checks are simply skipped when there's no schedule to check against. This
  alone would have masked most symptoms of this bug going forward, but the
  underlying permission gate is fixed properly rather than relied on as a
  workaround.
- Verified via a real Playwright run against prod (`tests/e2e/clockin_test.py`)
  logged in as a real account — GPS, photo, and Clock In/Out all completed
  successfully end-to-end.
