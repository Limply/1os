# 1OS ↔ NAS Project-File Integration — Plan

**Status:** Plan approved + refined 2026-06-27 (scope, hyperlinks, config split locked); not yet built
**Tracking task:** `SE-26-214` → "1OS Internal Development" → task *"Link 1OS to NAS project-file tree (auto-create folders & files)"*
**Related memory:** `project_1os_nas_integration.md`

---

## Goal
1OS auto-creates and manages the NAS project-file tree so staff add/read files both
in-app and over SMB, with the app as the source of truth.

## Scope (what goes in the tree)
- **In scope — customer-facing docs:** quotations, invoices, delivery orders, service reports,
  site photos, project documents. Anchor = **Client → Project**.
- **Out of scope — internal/people docs:** HR (employee certs, claim receipts) and CRM notes stay
  in their existing FileBrowser stores (`database/`, `attendance/`, `claims/`); they belong to a
  person/client, not a project.
- **Client-level docs** without a project (NDA, master agreement, logo) → a `_client/` folder
  under the client, not a project folder.

## Architecture
- Gunicorn (`1os.service`) runs as **`lucus`**; Samba forces user **`lucus`**; the tree
  lives on **`/mnt/data`** (same disk as `MEDIA_ROOT=/mnt/data/1os/media`).
- → 1OS writes **directly to the local filesystem** — no API/SMB hop, no permission
  mismatch between app-written and user-dropped files.
- The existing `shared/storage.py` `FileBrowserStorage` (random UUID filenames) is **not**
  reused here; a new direct-filesystem path is needed to keep names human-readable.

## Folder convention (already applied to existing folders)
```
{NAS_PROJECTS_ROOT}/                         ← env, per-server (base mount)
  {Company.nas_folder}/                      ← tenant base name (company profile, DB)
    <YYYY-MM_Customer-Name>/                 ← Client.nas_folder (DB, overridable) — hyperlinked from Client
      _client/                               ← client-level docs, no project
      <SE-YY-NNN>/                           ← project = quote_no — hyperlinked from Project/Quote/Invoice
        <SE-YY-NNN-[Tag].ext>                ← tagged flat files
        Photos/                              ← only subfolder (bulk image dumps)
```
- **Granularity:** tagged flat files at project root (decided 2026-06-27); `Photos/` is the only
  per-project subfolder. Tags: `[Quote]` `[Inv]` `[SR]` `[DO]` `[PO]`.
- Date prefix = client created month → folders sort chronologically.

## Model mapping
| NAS level | 1OS model |
|---|---|
| base root | `NAS_PROJECTS_ROOT` env var (per-server) — **not** in DB |
| `{Company.nas_folder}/` | `organisation.Company` (new `nas_folder` field, company profile) |
| `YYYY-MM_Customer/` | `organisation.Client` (new `nas_folder` field, stored + overridable) |
| `SE-YY-NNN/` | `projects.Project.project_no` (≈ `finance.Quotation.quote_no`) |
| files | new `ProjectDocument` (relative path + tag + uploaded_by) |

## Hyperlinks (in-app → NAS)
- **Method:** deep-link into the existing **FileBrowser** (`files.sim-eng.com`) at the folder path —
  opens in any browser, reuses existing infra. **No `file://` / `\\server\` links** (browsers block them).
- **Also show** the UNC/SMB path as copyable text for staff who mapped the `[projects]` drive.
- **Link targets:** Client record → client folder; Project / Quotation / Invoice record → project folder.

## Config split (shared-DB safe)
Dev and prod share `1os_db`, so the absolute root must **not** live in the DB:
- **`NAS_PROJECTS_ROOT` (env, per-server):** prod `/mnt/data/1os/SE-Bizz/Projects`, dev `/mnt/data/1os/SE-Bizz/_DEV/Projects`.
- **Folder *names* (DB):** `Company.nas_folder` + `Client.nas_folder`, joined under the env root.
- **Sanitize** every DB-sourced name (strip `/`, `..`, leading dots) before it hits the filesystem — path-traversal guard.

## Decisions
- **Business root:** `/mnt/data/1os/SE-Bizz` (decided 2026-06-27). The `SimplyEngineering` folder was
  renamed to `SE-Bizz` and the whole 446M / 43-folder tree was **moved out of `Backup/`** to
  `/mnt/data/1os/SE-Bizz` (done 2026-06-27 — same-disk `mv`, so the planned migration step is complete).
  Over SMB this is now `N:\1os\SE-Bizz` (was `N:\Backup\SE-Bizz`).
- **Prod tree:** `/mnt/data/1os/SE-Bizz/Projects`.
- **Dev sandbox:** `/mnt/data/1os/SE-Bizz/_DEV/Projects`, selected via env `NAS_PROJECTS_ROOT`
  (dev shares `1os_db` **and** `/mnt/data`, so it must never touch live folders).
- **New Samba `[projects]` share** → `/mnt/data/1os/SE-Bizz/Projects` (staff map a clean drive).
- **Client rename** in-app → **auto-rename** the NAS folder (admin-safeguarded).
- **Backup gap (open):** the tree no longer lives under a folder named `Backup` and **has no real
  backup job** — set up an actual backup (rsync to another disk/cloud) for `/mnt/data/1os/SE-Bizz`.

## Build phases
1. **Config** — `NAS_PROJECTS_ROOT` in `.env`/`base.py`; create `[projects]` Samba share.
2. **Models** — `Company.nas_folder` + `Client.nas_folder` (+migration); `Project.nas_path` helper;
   `shared/nas.py` service (`ensure_client_folder`, `ensure_project_folder`, `save_document`,
   `folder_url` → FileBrowser deep-link; sanitize; `makedirs`; atomic writes; 0775/0664).
3. **Hooks** — Client create → folder; Project create → SE folder; Client rename → auto-rename.
   **Auto-file generated docs:** quotation PDF / service report export → write a copy into the
   project folder as `SE-YY-NNN-[Tag].pdf`.
4. **Documents** — `ProjectDocument` model + upload/list/download API (stream from disk) +
   Files tab on the Project page; **FileBrowser folder hyperlink** (+ copyable UNC path) on
   Client / Project / Quotation / Invoice records. Apply `Array.isArray` guard + inline red errors.
5. **Reconcile command** — link existing ~19 folders; report orphans; show
   "file missing on NAS" gracefully (users can still move files over SMB).

## Migration
- ✅ **Done 2026-06-27:** `SimplyEngineering` → `SE-Bizz` rename + same-disk `mv` of the tree to
  `/mnt/data/1os/SE-Bizz/Projects` (out of `Backup/`).
- ⬜ Remaining: add the `[projects]` Samba share → `/mnt/data/1os/SE-Bizz/Projects`; re-map staff
  drive (path changed to `N:\1os\SE-Bizz`); point a real backup at the new tree.

## Prep already done
- 19 customer folders renamed to `YYYY-MM_Customer-Name`; loose files grouped into
  `SE-YY-NNN` subfolders.
- `_README_DO-NOT-MOVE-OR-DELETE.txt` notice placed at the Projects root.

## Open items
- Set up a real backup job for `/mnt/data/1os/SE-Bizz` (no longer under a `Backup/` folder).
- Create the `[projects]` Samba share and re-map staff drive to `N:\1os\SE-Bizz`.
