# 1OS ↔ NAS Project-File Integration — Plan

**Status:** Plan approved, not yet built (as of 2026-06-26)
**Tracking task:** `SE-26-214` → "1OS Internal Development" → task *"Link 1OS to NAS project-file tree (auto-create folders & files)"*
**Related memory:** `project_1os_nas_integration.md`

---

## Goal
1OS auto-creates and manages the NAS project-file tree so staff add/read files both
in-app and over SMB, with the app as the source of truth.

## Architecture
- Gunicorn (`1os.service`) runs as **`lucus`**; Samba forces user **`lucus`**; the tree
  lives on **`/mnt/data`** (same disk as `MEDIA_ROOT=/mnt/data/1os/media`).
- → 1OS writes **directly to the local filesystem** — no API/SMB hop, no permission
  mismatch between app-written and user-dropped files.
- The existing `shared/storage.py` `FileBrowserStorage` (random UUID filenames) is **not**
  reused here; a new direct-filesystem path is needed to keep names human-readable.

## Folder convention (already applied to existing folders)
```
Projects/<YYYY-MM_Customer-Name>/<SE-YY-NNN>/<SE-YY-NNN-[Tag].ext>
```
- Tags: `[Quote]` `[Inv]` `[SR]` `[DO]` `[PO]`
- Date prefix = client created month → folders sort chronologically.

## Model mapping
| NAS level | 1OS model |
|---|---|
| `YYYY-MM_Customer/` | `organisation.Client` (new `nas_folder` field, stored + overridable) |
| `SE-YY-NNN/` | `projects.Project.project_no` (≈ `finance.Quotation.quote_no`) |
| files | new `ProjectDocument` (relative path + tag + uploaded_by) |

## Decisions
- **Prod tree:** `/mnt/data/SE-Bizz/Projects` (moved out of the misleadingly-named `Backup/`;
  no real backup job writes there).
- **Dev sandbox:** `/mnt/data/SE-Bizz/_DEV/Projects`, selected via env `NAS_PROJECTS_ROOT`
  (dev shares `1os_db` **and** `/mnt/data`, so it must never touch live folders).
- **New Samba `[projects]` share** → `/mnt/data/SE-Bizz/Projects` (staff map a clean drive).
- **Client rename** in-app → **auto-rename** the NAS folder (admin-safeguarded).

## Build phases
1. **Config** — `NAS_PROJECTS_ROOT` in `.env`/`base.py`; create `[projects]` Samba share.
2. **Models** — `Client.nas_folder` (+migration); `Project.nas_path` helper;
   `shared/nas.py` service (`ensure_client_folder`, `ensure_project_folder`, `save_document`;
   sanitize; `makedirs`; atomic writes; 0775/0664).
3. **Hooks** — Client create → folder; Project create → SE folder; Client rename → auto-rename.
4. **Documents** — `ProjectDocument` model + upload/list/download API (stream from disk) +
   Files tab on the Project page. Apply `Array.isArray` guard + inline red errors.
5. **Reconcile command** — link existing ~19 folders; report orphans; show
   "file missing on NAS" gracefully (users can still move files over SMB).

## Migration (on green-light)
Single same-disk `mv` of the tree → `/mnt/data/SE-Bizz/Projects`; add the `[projects]` share;
re-map staff drive; then point a real backup at the new tree.

## Prep already done
- 19 customer folders renamed to `YYYY-MM_Customer-Name`; loose files grouped into
  `SE-YY-NNN` subfolders.
- `_README_DO-NOT-MOVE-OR-DELETE.txt` notice placed at the Projects root.

## Open item
- Confirm dev sandbox path `/mnt/data/SE-Bizz/_DEV/Projects`.
