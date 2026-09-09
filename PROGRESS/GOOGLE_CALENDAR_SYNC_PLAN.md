# 1OS — Google Calendar Two-Way Sync — Plan

**Status:** 📋 **Plan only — nothing built.** Written 2026-09-09; blockers §1 and §2 resolved
same day (see below), so Phase 0 is done and Phase 1 is unblocked.
**Scope decided:** two-way OAuth sync, generic pluggable plumbing, four 1OS event sources
(`CalendarEvent`, work schedules/manpower, project & task dates).
**Related:** `services/hr` (`CalendarEvent`, `WorkSchedule`, `StaffDeployment`), `services/projects`
(`Project`, `Task`), `shared/` (BaseModel, middleware), `PROGRESS/DEVELOPMENT.md` (Decoupling Rule,
Field Naming, Calendar Architecture).

---

## ⚠️ Read this before writing any code

### 1. ~~Dev and prod share one database~~ — RESOLVED 2026-09-09
The original blocker was that `/home/lucus/1os-dev` and `/opt/1os` both pointed at `1os_db`, so two
sync loops would consume the same Google `syncToken` and double-push into real calendars. **The dev
install was retired the same day** (see `DEVELOPMENT.md` → Environments). One install, one loop, no
`GCAL_SYNC_ENABLED` split needed.

**But it inverts into a different risk, and this one is worse for a sync engine.** There is now no
staging at all, so the first time this code ever talks to Google it will be doing so *from
production*, against somebody's real calendar. A DB restore does not undo a `events.delete` call.
So the safety has to move into the code itself:

- **`--dry-run` is Phase 3's first deliverable, not an afterthought.** It logs every intended API
  call and makes none. Every new source adapter gets exercised through it before it ever runs live.
- **`GCAL_TEST_ACCOUNTS`** in `.env`: while a source is unproven, the sync command refuses to run for
  any Google address not in that list. Connect one throwaway Google account, prove the round-trip,
  then remove the guard. This replaces what a dev install would have given you.
- **A kill switch that works without a deploy:** `SyncedCalendar.enabled=False` (per user, per source)
  and `GoogleAccount.status='error'` both stop the loop immediately from the Django admin. Reach for
  these before touching the timer.
- **Push before pull, one source before five.** `CalendarEvent` push-only end-to-end, watched for a
  few days, before any code path is allowed to delete a local row on Google's say-so.

### 2. ~~OAuth consent screen type~~ — RESOLVED 2026-09-09: you have Google Workspace
Confirmed by DNS, not by assumption:

```
$ dig +short MX astronic.com.sg
10 ASPMX.L.GOOGLE.COM.   20 ALT1.ASPMX.L.GOOGLE.COM.   …
$ dig +short TXT astronic.com.sg
"v=spf1 include:_spf.google.com ~all"
```

`astronic.com.sg` receives mail through Google. **So the OAuth consent screen can be created as
"Internal"**, which is the good outcome:

- No Google verification, no brand review, no security assessment.
- **Refresh tokens do not expire** — no weekly re-consent. (The 7-day expiry that would have killed
  this project applies to External apps left in Testing.)
- Sensitive-scope restrictions don't apply the same way, so plain
  `https://www.googleapis.com/auth/calendar` is available.

Two caveats before relying on it:

1. **Internal only covers users inside the Workspace.** Anyone signing in with a personal `@gmail.com`
   cannot use an Internal app. Fine if every 1OS user gets an `@astronic.com.sg` account; a blocker
   for workers who would connect a personal Gmail. This is now the deciding question — see Open
   Questions #2.
2. **Still prefer the narrow scope where it works.** `calendar.app.created` limits 1OS to calendars it
   created itself, which matches the design (§ Calendar layout) and means a bug cannot touch the
   user's own events at all. Internal removes the *verification* reason to prefer it; the
   *blast-radius* reason stands. Start with it, widen only if something genuinely needs it.

> Note: an earlier `PROGRESS/` note recorded Zoho Mail for the email→quotation pipeline. That does not
> contradict the MX above — either it refers to a different domain/mailbox or the plan changed. Google
> is where `astronic.com.sg` mail actually lands today.

### 3. "Two-way" is only safe for one of the four sources
You picked two-way. That is right for personal events and wrong for the other three, because the other
three are **derived business records with constraints Google cannot satisfy**:

| Source | Direction | Why |
|---|---|---|
| `hr.CalendarEvent` | ↔️ **Two-way** | Free-form, user-owned, private, no constraints. Google is a legitimate second editor. |
| `hr.WorkSchedule` | ➡️ **Push only** | `unique_together(employee, date)`, and `location_lat`/`lng`/`radius` are **required and drive clock-in geofencing**. An event dragged in Google carries no lat/lng — accepting it would either violate the constraint or silently break someone's ability to clock in. |
| `hr.StaffDeployment` | ➡️ **Push only** (expanded) | It is a *recurrence rule*, not an event. Editing one expanded occurrence in Google has no unambiguous meaning back in 1OS. |
| `projects.Task` / `Project` | ➡️ **Push only** | `start_date`/`end_date` feed Gantt + `recalculate_progress()`. Schedule changes belong in the project plan, with its permission checks — not in whoever's Google Calendar. |

Push-only means: 1OS is authoritative, and an edit made in Google is **reverted on the next sync**.
The architecture below still supports two-way per-source, so any of these can be promoted later —
but ship them one-way.

**If you disagree and want `WorkSchedule` two-way from day one, say so** — it is doable, but it needs a
geocoding step and an explicit "inherit lat/lng from the previous schedule" rule, which is extra scope.

---

## Goal
A 1OS user connects their Google account once. Thereafter:
- Their 1OS personal calendar events and their Google events stay mirrored, both directions.
- Their work schedule, deployments, and project/task dates appear in Google automatically.
- Disconnecting removes the 1OS-created calendars and leaves their own data untouched.

## Architecture — how this obeys the Decoupling Rule

The Primary Rule says services never import each other's models. A sync engine that imports
`hr.CalendarEvent` *and* `projects.Task` would break it. So **the engine imports nothing from
services; services register themselves with the engine.**

```
shared/calendar_sources.py          ← interface + registry (shared layer, allowed cross-service)
    class EventSource(ABC)
    register(source)  /  get_sources()

services/hr/calendar_sources.py     ← hr owns its adapters, imports only hr models
    CalendarEventSource, WorkScheduleSource, StaffDeploymentSource
services/projects/calendar_sources.py
    TaskSource, ProjectSource
        ↑ each registered from that app's AppConfig.ready()

services/calendar_sync/             ← the engine. Imports shared + accounts.User only.
    models.py  views.py  urls.py  engine.py  google_client.py
    management/commands/gcal_sync.py
```

`services/calendar_sync/` never mentions `hr` or `projects`. Adding a fifth source later (leave
applications, compliance expiries) is one new adapter file in the owning service — zero engine changes.

### The `EventSource` interface

```python
class EventSource(ABC):
    key: str                 # 'hr.calendar_event' — stable, stored in EventLink
    label: str               # 'My Events' — shown in the UI
    direction: str           # 'push' | 'both'
    default_color: str       # Google colorId

    def list_for_user(self, user, date_from, date_to) -> list[SourceEvent]: ...
    def changed_since(self, user, since) -> list[SourceEvent]: ...
    # 'both' sources only:
    def apply_remote(self, user, link, google_event) -> None: ...
    def delete_local(self, user, link) -> None: ...
    def create_local(self, user, google_event) -> SourceEvent: ...
```

`SourceEvent` is a plain dataclass in `shared/` — `(source_key, local_id, title, description, start,
end, all_day, location, color, updated_at)`. The engine only ever handles `SourceEvent`, never a
Django model from another service.

## Data model — `services/calendar_sync/models.py`

All inherit `BaseModel` (UUID pk, `created_at`, `updated_at`, `is_active`). FK names carry **no `_id`
suffix**, dates use `_date`, status is `status` — per the Field Naming Convention.

```python
class GoogleAccount(BaseModel):
    """One connected Google account per 1OS user."""
    user            = OneToOneField('accounts.User', CASCADE, related_name='google_account')
    google_email    = EmailField()
    refresh_token   = TextField()          # Fernet-encrypted at rest — see Security
    access_token    = TextField(blank=True)
    token_expiry    = DateTimeField(null=True)
    scopes          = JSONField(default=list)
    status          = CharField(choices=['connected','expired','revoked','error'], default='connected')
    last_error      = TextField(blank=True)
    connected_at    = DateTimeField(auto_now_add=True)

class SyncedCalendar(BaseModel):
    """One Google calendar per (account, source). 1OS creates and owns these."""
    account            = ForeignKey(GoogleAccount, CASCADE, related_name='calendars')
    source_key         = CharField(max_length=50)      # matches EventSource.key
    google_calendar_id = CharField(max_length=255)
    summary            = CharField(max_length=200)     # '1OS — My Events'
    sync_token         = TextField(blank=True)         # Google incremental cursor
    channel_id         = CharField(max_length=255, blank=True)   # push webhook (Phase 5)
    channel_expiry     = DateTimeField(null=True)
    enabled            = BooleanField(default=True)
    last_synced_at     = DateTimeField(null=True)
    class Meta: unique_together = ('account', 'source_key')

class EventLink(BaseModel):
    """Maps one 1OS record to one Google event. The heart of the sync."""
    calendar         = ForeignKey(SyncedCalendar, CASCADE, related_name='links')
    source_key       = CharField(max_length=50)
    local_id         = CharField(max_length=64)        # UUID str, or 'deployment:<uuid>:2026-09-14'
    google_event_id  = CharField(max_length=1024)
    etag             = CharField(max_length=255, blank=True)
    local_hash       = CharField(max_length=64)        # sha256 of pushed payload — cheap dirty check
    local_updated_at = DateTimeField(null=True)
    remote_updated_at= DateTimeField(null=True)
    status           = CharField(choices=['ok','pending_push','pending_pull','conflict','deleted'], default='ok')
    class Meta:
        unique_together = ('calendar', 'local_id')
        indexes = [Index(fields=['calendar','google_event_id'])]

class SyncRun(BaseModel):
    """One execution of the sync command. Your audit trail when something goes wrong."""
    account   = ForeignKey(GoogleAccount, CASCADE, related_name='runs')
    started_at, finished_at = DateTimeField(...)
    trigger   = CharField(choices=['timer','webhook','manual'])
    pushed = pulled = conflicts = errors = IntegerField(default=0)
    detail    = JSONField(default=dict)
```

**Why a separate `EventLink` table rather than a `google_event_id` column on each source model:** the
engine must not migrate other services' tables (Independent Migrations rule), push-only sources are
read-only to the engine, and `StaffDeployment` expands to *many* Google events from one row.

## Calendar layout in Google

1OS creates **one secondary calendar per source**, not one big calendar:

| `source_key` | Google calendar | Colour |
|---|---|---|
| `hr.calendar_event` | `1OS — My Events` | blue |
| `hr.work_schedule` | `1OS — My Schedule` | green |
| `hr.staff_deployment` | `1OS — My Deployments` | green |
| `projects.task` | `1OS — My Tasks` | amber |
| `projects.project` | `1OS — My Projects` | purple |

The user toggles each on/off in Google natively, and "disconnect" deletes exactly these five and
nothing else. This is also what makes the least-privilege `calendar.app.created` scope work.

## Field mapping

| 1OS | Google `event` | Note |
|---|---|---|
| `title` | `summary` | Task prefixed `[SE-26-001]`, schedule prefixed with site name |
| `notes` / `description` | `description` | Push-only sources append a deep link back into 1OS |
| `date` + `start_time`/`end_time` | `start.dateTime` / `end.dateTime` | `timeZone: 'Asia/Singapore'` — `TIME_ZONE` is already Asia/Singapore, `USE_TZ=True` |
| `all_day=True` | `start.date` / `end.date` | Google's all-day `end` is **exclusive** — add one day, this is the classic off-by-one |
| `location_name` / `site_address` | `location` | |
| `color` | `colorId` | 1OS's six names → Google's palette ids, in a dict in the adapter |
| — | `extendedProperties.private` | `{os1_source, os1_local_id, os1_install}` — lets the engine recognise its own events even if `EventLink` is lost, and `os1_install` (`prod`/`dev`) is the last line of defence against the shared-DB problem |

`CalendarEvent` has no timezone field; everything is Asia/Singapore. If staff ever work outside SG this
needs a `timezone` column first.

**Date-only sources need a rule:** `Task.start_date`/`end_date` and `Project.start_date`/`end_date` have
no times → push as all-day events. A task with only `due_date` becomes a single all-day event on the
due date.

## Sync engine — `engine.py`

Per account, per enabled calendar:

**1. Pull (Google → 1OS)** — `events.list(calendarId, syncToken=...)`, paged.
- No `sync_token` yet, or `410 GONE` → full list over the sync window, then store the fresh token.
- For each returned event: `status == 'cancelled'` → the event was deleted in Google.
- Push-only calendar → any remote change is a **drift**: re-push 1OS's version over it and count it in
  `SyncRun.detail`. (Don't spam the user; surface a badge if drift is persistent.)
- Two-way calendar → match by `EventLink.google_event_id`; no link + `extendedProperties` absent = the
  user created it in Google → `create_local()`. Deleted in Google → `delete_local()`.

**2. Push (1OS → Google)** — `source.changed_since(user, calendar.last_synced_at)`.
- Compute `local_hash`; unchanged → skip (this keeps the common case at zero API calls).
- No `EventLink` → `events.insert`, store id + etag.
- Existing link → `events.patch` with `If-Match: <etag>`. A **412** means Google changed underneath
  you → that is the conflict path.
- Local row gone → `events.delete`, mark link `deleted`.

**3. Conflict resolution** (two-way sources only)
- **Last-write-wins on `updated`**, comparing 1OS `updated_at` against Google's `updated`.
- Ties, or a 412 where both sides moved since `local_hash` was taken → mark `EventLink.status='conflict'`,
  **keep both** (leave Google's version, restore 1OS's as a new event titled `⚠ 1OS version`), and let the
  user resolve it. Silently discarding one side of a real conflict is how sync tools lose people's data.
- Every conflict lands in `SyncRun.detail` and a `notifications` entry.

**4. Sync window.** Never sync all of history: `date_from = today - 90d`, `date_to = today + 365d`,
configurable via `GCAL_SYNC_WINDOW_PAST_DAYS` / `_FUTURE_DAYS`. `StaffDeployment` expands only inside
this window.

**5. Backoff.** 403 `rateLimitExceeded` / 429 / 5xx → exponential backoff with jitter, max ~5 tries,
then abort that calendar and record the error. 401 → refresh; refresh fails → `status='revoked'`,
notify the user to reconnect, and **stop** (do not retry a revoked grant in a loop).

## Scheduling — there is no Celery in this project

The repo has **no task queue** (no Celery, no Redis, no APScheduler). The only existing scheduled work
is `scripts/backup_db.sh` on a systemd timer. Follow that precedent — do not introduce Celery for this.

```ini
# /etc/systemd/system/1os-gcal-sync.service   (Type=oneshot, prod only)
ExecStart=/opt/1os/venv/bin/python /opt/1os/manage.py gcal_sync --all
# /etc/systemd/system/1os-gcal-sync.timer
OnCalendar=*:0/10          # every 10 minutes
RandomizedDelaySec=60
```

`manage.py gcal_sync [--all | --user <email>] [--source <key>] [--dry-run] [--full-resync]`

`--dry-run` prints the intended API calls without making them. Build it first and use it for the whole
of Phase 3 — it is the only safe way to test against a real Google account.

A single `flock` in the command prevents overlapping runs (a slow run must not be re-entered by the
next timer tick).

## Security

- **Refresh tokens are credentials to a user's whole calendar.** Encrypt at rest with Fernet
  (`cryptography`), key in `.env` as `GCAL_TOKEN_KEY`, never the Django `SECRET_KEY` — rotating one
  must not destroy the other. Add a `EncryptedTextField` in `shared/` or encrypt in the model's
  `save()`; the plaintext must never be in a serializer, `__str__`, log line, or the Django admin.
- **OAuth state parameter** must be a signed, single-use, short-TTL token bound to the 1OS user, or the
  callback is a CSRF hole that attaches an attacker's Google account to a victim's 1OS user.
- **Redirect URI** is exact-match at Google: `https://ast1.sim-eng.com/api/calendar-sync/oauth/callback/`
  (and the dev host, in the dev Cloud project only).
- **Never log** tokens, `refresh_token`, or full event bodies. `SyncRun.detail` stores counts and ids.
- **RBAC:** no new permission constant needed — every endpoint is strictly self-scoped
  (`GoogleAccount.objects.get(user=request.user)`), exactly like `CalendarEventViewSet`. An admin must
  **not** be able to read another user's tokens or events.
- Add `calendar_sync` to the `Tenant.modules` key list so Module Lock can gate it.

## API — `/api/calendar-sync/`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/status/` | connection state, per-source toggles, last run, conflict count |
| `POST` | `/oauth/start/` | returns Google consent URL + signed state |
| `GET` | `/oauth/callback/` | exchanges code, creates `GoogleAccount` + calendars |
| `POST` | `/disconnect/` | revokes token at Google, deletes the five 1OS calendars, purges links |
| `PATCH` | `/sources/<key>/` | enable/disable one source |
| `POST` | `/sync-now/` | manual trigger (rate-limited, e.g. 1/min/user) |
| `GET` | `/conflicts/` · `POST /conflicts/<id>/resolve/` | list and resolve |
| `POST` | `/webhook/` | Google push channel (Phase 5) |

## Frontend

- **`pages/Settings.jsx`** — new "Integrations" section: Connect/Disconnect, connected Google address,
  per-source checkboxes, last-synced time, "Sync now", conflict list.
- **`pages/Personal.jsx`** (`/my` Calendar tab) — small "Synced with Google ✓ / Connect" affordance.
- **No change to `components/CalendarView.jsx`** — the Calendar Architecture rule says it takes an
  `events[]` prop and holds no API calls. Sync state belongs on the pages.
- **Error Display Rule:** every action here (connect, disconnect, sync-now, resolve) surfaces inline red
  error text. No silent `.catch(() => {})`. OAuth failure especially — a user who clicks Connect and sees
  nothing happen will click it five more times.

## Dependencies to add to `requirements.txt`

```
google-auth
google-auth-oauthlib
google-api-python-client
cryptography
```

Pin exact versions, matching the existing style in that file.

## Phases

| # | Phase | Deliverable | Rough effort |
|---|---|---|---|
| 0 | **Decide** | Consent-screen type answered (§2); dev/prod DB guard agreed (§1); per-source direction confirmed (§3) | — |
| 1 | Plumbing | `shared/calendar_sources.py`, `services/calendar_sync` app + models + migration, encrypted token field, `GCAL_SYNC_ENABLED` guard | ~1 day |
| 2 | OAuth | Cloud project, consent screen, connect/callback/disconnect, calendar creation, Settings UI | ~1 day |
| 3 | Push, one source | `CalendarEventSource` → Google, `--dry-run`, `gcal_sync` command, systemd timer | ~1–2 days |
| 4 | Pull + conflicts | Incremental `syncToken`, two-way for `CalendarEvent`, LWW + conflict UI | ~2 days |
| 5 | Remaining sources | `WorkSchedule`, `StaffDeployment` (expansion), `Task`, `Project` — all push-only | ~1–2 days |
| 6 | Webhooks (optional) | `events.watch` channels + renewal timer, for near-real-time instead of 10-min polling | ~1 day |

Phases 1–4 are the real system; 5 is mostly adapter code once 1–4 work. **Do not start Phase 1 before
Phase 0 is answered** — a "no Workspace, testing mode" answer means weekly re-consent and changes the
whole plan.

## Open questions for you

1. **Do you have Google Workspace on a domain you control?** (§2 — decides everything.)
2. **Whose calendars?** Just you and admins, or every employee including workers who clock in by phone?
   Fifty connected accounts × 10-min polling is a real quota and support consideration.
3. **`WorkSchedule` push-only, or two-way with geocoding?** (§3.)
4. **What does a worker see for a shift** — the site name, the address, the geofence radius, teammates?
5. **Should `StaffDeployment` push as a native Google recurring event (`RRULE`) instead of expanded
   occurrences?** Cleaner in Google, considerably more complex to keep in sync. Recommend expanded first.

## Footguns, collected

- Dev/prod shared DB → duplicate pushes into live calendars (§1). **The one that will actually bite.**
- External/testing consent screen → refresh tokens die after 7 days (§2).
- Google all-day `end.date` is **exclusive** — off by one day.
- `410 GONE` on a stale `syncToken` is normal, not an error — handle it as "full resync", don't alert.
- Deleting an `EventLink` row without deleting the Google event orphans it forever; always delete remote
  first, then the link.
- `Task.save()` calls `project.recalculate_progress()` — an adapter must not write Tasks in a loop.
- A user who revokes access in their Google account settings gives no callback; you find out via a 401.
- `WorkSchedule.unique_together(employee, date)` makes naive two-way pull throw `IntegrityError`.
