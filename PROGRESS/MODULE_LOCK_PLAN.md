# 1OS — Module Lock Function — Plan

**Status:** ✅ **Built on dev branch 2026-06-28** (not yet committed/deployed). Verified: `manage.py check`
clean, frontend `vite build` passes, `tenant_info` returns `modules`. SE tenant `modules=[]` → nothing
locked (backward compatible).
**To switch modules off for a tenant (e.g. Astronic):** deploy this branch to that server, then set the
tenant's `Tenant.modules` to the list of module keys to **keep**. Empty = all on. Anything not listed
(except core `dashboard`) shows a locked "Coming soon" item + ComingSoon route page.
Module keys: `projects, hr, crm, operations, finance, compliance, files`.
**Related:** auth `Tenant.modules` (DB, already exists), `User.modules`, `shared/permissions.py`.

---

## Goal
When a tenant has **not paid** for a module, that module is **locked**: shown in the sidebar as a greyed,
non-clickable **"Coming Soon"** item, and direct navigation to its route renders a ComingSoon page instead
of the feature. Tenant entitlement is **tenant-wide** — it applies to everyone in the tenant, including admins.

## Decisions locked in
- **UX:** Coming Soon (locked & visible), **not** hidden — supports upsell.
- **Enforcement:** sidebar display **+ route guard**. **No** backend API 403 (frontend gate only — this is a
  UX/upsell gate, *not* a security boundary; a direct API call still returns data).
- **Scope:** **top-level modules only.** Sub-modules (sidebar children + Finance tabs) follow their parent.
- **Source of truth for "paid":** existing `Tenant.modules` (JSON list of module keys in DB).
- **Unconfigured = all enabled:** empty `Tenant.modules` ⇒ every module on (keeps existing prod tenants
  working). ⚠️ Footgun: "pays for nothing" and "unconfigured" look identical — to restrict a tenant you must
  list *every* paid module explicitly; any key you forget disappears for them.

## Two stacked gates (tenant gate wins)
```
1. isModulePaid(key, tenant.modules)?  ── No ─→  COMING SOON (lock)   [beats admin]
        │ Yes
2. canSee(key, user.modules, isAdmin)? ── No ─→  HIDDEN
        │ Yes
3.                                     ──────→  SHOWN
```
`isModulePaid` = true if key is core, OR `tenant.modules` empty, OR `tenant.modules` includes key.

## Module control matrix
| key | label | route(s) | class | gated? |
|---|---|---|---|---|
| `dashboard` | Dashboard | `/`, `/orgchart`, `/my` | core | no |
| `projects` | Projects | `/projects`, `/calendar` | feature | yes |
| `hr` | HR | `/hr`, `/schedules` | feature | yes |
| `crm` | CRM | `/crm` | feature | yes |
| `operations` | Operations | `/operations` | feature | yes |
| `finance` | Finance | `/finance`, `/finance/pl`, `/finance/payments` | feature | yes |
| `compliance` | Compliance | `/compliance` | feature | yes |
| `files` | Files | `/files` | feature | yes |
| — | Settings | `/settings` | core | no |

## Implementation outline
**Backend (1 line):** `services/auth/views.py` → `tenant_info` response: add `'modules': t.modules`.
(Dev runs `--noreload` → restart `1os-dev-django.service` after.)

**Frontend — new files:**
- `utils/modules.js` — single source of truth: flat `MODULES` registry (key, label, route, gated/core),
  `CORE_MODULES`, `isModulePaid(key, tenantModules)`.
- `utils/tenant.js` — cached `fetchTenantInfo()` + `useTenantInfo()` hook (de-dupes the 3 existing
  tenant-info fetches). Use `Array.isArray` guard on `modules`.
- `pages/ComingSoon.jsx` — locked landing page (lock icon, "not included in your current plan").
- `components/ModuleGate.jsx` — route wrapper: unpaid → render `ComingSoon` instead of children.

**Frontend — edits:**
- `components/Sidebar.jsx` — per top-level link: unpaid → greyed 🔒 "Coming soon", not clickable
  (applies to admins too); paid → existing per-user `canSee` logic unchanged.
- `App.jsx` — wrap gated routes (`/projects`, `/hr`, `/schedules`, `/crm`, `/operations`, `/finance*`,
  `/compliance`, `/files`) in `<ModuleGate module="…">`. Core routes stay open.

## The registry (flat) — recommended
Chosen over a nested tree because scope is top-level-only. Kills drift on the gating dimension without a
sidebar rewrite. Sidebar keeps its own children structure.

## Hard coupling to respect
The `key` strings in `MODULES`, the values stored in `Tenant.modules` (DB), and the `module:` strings in
the sidebar **must all match.** Renaming a key without updating tenant DB rows hides that module for those
tenants.

## Deferred / future
- **API enforcement (403 per viewset):** only needed if "unpaid tenant must not access the *data*" becomes a
  sales promise. Moderate work, touches every gated service. Currently out of scope.
- **Sub-module / tab gating:** out of scope for v1.
- **Superadmin Settings UI** to tick paid modules (instead of editing JSON in Django admin): not in v1.
