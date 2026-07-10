# Mindset Log — Feature Spec

**Status:** spec ready, not yet built
**Where to build:** seserver (192.168.1.27), on the `dev` branch, in whatever the SE-instance equivalent of `/home/lucus/1os-dev/` is (path not yet confirmed for seserver specifically — `DEVELOPMENT.md`'s dev-path/service-name doc is written for astserver/Astronic; seserver has its own `1os-dev-django.service`/`1os-dev-vite.service`, confirm the actual working directory there first, e.g. `systemctl cat 1os-dev-django` or check the service's `WorkingDirectory=`).
**Origin:** operationalizes the daily practice defined in `Projects/Lucus/Mindset-NorthStar/goal.md`.

---

## Goal
A per-user, per-day log for the three-anchor mindset practice (Morning Anchor / Midday Checkpoint / Evening Close), filled in progressively through the day — not a separate app, a new tab on the existing "Personal" page in 1OS.

## Why a new model, not `PersonalGoal`
`PersonalGoal` (`services/hr/models.py`) is a checklist/todo model (`text`, `is_achieved`, `order`) — no date field, no one-per-day concept. The closer structural precedent is `DailyReport` (`services/projects/models.py:211-236`): date-stamped, owner-scoped, one row represents one day. This spec follows that shape, plus `Attendance`'s `unique_together=('employee','date')` pattern to enforce one row per user per day.

## Data Model — `services/hr/models.py`
```python
class MindsetLog(BaseModel):          # BaseModel: id(uuid), created_at, updated_at, is_active
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='mindset_logs')
    date = models.DateField(default=datetime.date.today)

    # Morning Anchor
    expect_it = models.CharField(max_length=300, blank=True)   # "Today I will ___"
    for_what = models.CharField(max_length=300, blank=True)    # "This is for ___"
    gratitude = models.CharField(max_length=300, blank=True)

    # Midday Checkpoint — free text, may happen 0-1 times in a day
    midday_note = models.TextField(blank=True)

    # Evening Close
    brick_placed = models.CharField(max_length=300, blank=True)
    mirror_not_wall = models.CharField(max_length=300, blank=True)
    chapter_closed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']
```
Migration: single `makemigrations hr` after adding the model — same pattern as `0014_personal_goal.py`.

## Serializer — `services/hr/serializers.py`
```python
class MindsetLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MindsetLog
        fields = ['id', 'date', 'expect_it', 'for_what', 'gratitude',
                  'midday_note', 'brick_placed', 'mirror_not_wall', 'chapter_closed']
        read_only_fields = ['id']
```

## ViewSet + URL — `services/hr/views.py`, `services/hr/urls.py`
Mirror `PersonalGoalViewSet` exactly:
```python
class MindsetLogViewSet(viewsets.ModelViewSet):
    serializer_class = MindsetLogSerializer
    permission_classes = [HRPermission]

    def get_queryset(self):
        return MindsetLog.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
```
Route: `router.register('mindset-logs', MindsetLogViewSet, basename='mindset-log')` → `/api/hr/mindset-logs/`.

Since `date` isn't unique per-request by default, the frontend should `GET /hr/mindset-logs/?date=<today>` (add a `date` query-param filter, or just filter client-side from the list — daily volume is tiny) to find today's row, then `PATCH` it if it exists or `POST` a new one if it doesn't, rather than always POSTing (would hit the `unique_together` constraint after the first save of the day).

## Frontend — `frontend/src/pages/Personal.jsx`
Add a `mindset` tab alongside `overview` / `goals` / `claims` / `calendar`:
- **Today's entry card** (top): three sections (Morning / Midday / Evening), each a small form. Morning fields required-feeling but not enforced; Evening section only meaningfully fillable once the day is winding down. Save via PATCH-or-POST-today logic above (debounced or explicit "Save" button per section — a full page of always-editable textareas is simplest, matches the goals tab's inline-edit pattern already in this file).
- **History list** (below): past entries, most recent first (`ordering = ['-date']` already handles this), read-only cards showing the three sections' text per day.
- Reuse existing tab styling/API-call patterns already in `Personal.jsx` (see the `goals` tab, lines ~342-488, for the closest existing precedent in this same file).

## Build order
1. Model + migration (`services/hr/models.py`, `makemigrations hr`)
2. Serializer (`services/hr/serializers.py`)
3. ViewSet + URL (`services/hr/views.py`, `services/hr/urls.py`)
4. Frontend tab on `Personal.jsx`
5. Test on seserver's dev environment (hot reload) against your own real user account
6. Commit to `dev`, push; merge to `main` + migrate + restart prod service once verified (see `DEVELOPMENT.md` deploy steps — same flow, seserver's own service names)

## Open / not decided
- Whether `midday_note` should support multiple entries per day (currently a single text field — if the checkpoint fires more than once some days, consider a small JSON list instead, same pattern as `DailyReport.activity_items`).
- Exact working directory / service names for seserver's dev environment — confirm on login, this doc assumes it mirrors astserver's layout but that's unverified.
