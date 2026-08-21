# Astronic Business File Scan — Summary

**Date:** 2026-07-31
**Purpose:** Inventory all business/financial-related files on this host as prep work for building a consolidated financial record & dashboard for Vincent to review.
**Scope:** Read-only scan. Nothing was moved, renamed, or deleted.

---

## Has this been done before?

**No.** No prior scan, inventory, or financial-consolidation doc exists in the `1os` PROGRESS folder, git history, or memory. This is the first pass. `03_Finance` on the shared NAS drive — the folder created specifically for this purpose per the official structure doc — is currently **empty**, which is itself the main finding (see below).

---

## Where business files actually live

| Location | Files | Size | What's in it |
|---|---|---|---|
| `/mnt/data/Astronic/03_Finance` | 0 | — | **Empty.** Official structure defines Invoices/Quotations/POs/Accounts/Tax/Petty-Cash subfolders, but none are populated. |
| `/mnt/data/Astronic/_1OS/Astronic-Dropbox` | 3,363 | ~part of 7.6G | Real quotation/tender/project working files, organised by year: `2025 - Tender, RFQ` (1,444), `2026 - Tender, RFQ` (618), `2025 - Project` (697), `2026 - Project` (604). |
| `/mnt/data/Astronic/_1OS/Projects` | included above | — | Per-client folders (14 clients: Fujitec, KONE, Hyundai Elevator, Otis, Schindler, TK Elevator, Mitsubishi Electric, LTA, Lazada One, Unabiz, FacilityBot, Simpple, Univers). Each site sub-folder holds the actual quotation PDF/XLSX (`Q25####`/`Q26####` numbered), scope-of-work, and cost-breakdown files. |
| `/mnt/data/Astronic/05_Projects` | 84 | 12G | Mixed: real client jobs (e.g. `2026 - Project/NexAscent - Canon` with numbered quotations, progress claims, VOs) alongside internal IT/app projects (website rebuild, GX Works3 PLC software, weight-tracking app) that aren't financial records. |
| `/mnt/data/Astronic/07_Sales` | 668 | 1.3G | `2026 - Tender, RFQ` — sales pipeline / tender documents. |
| `/mnt/data/Astronic/06_Safety_QA` | 399 | 1.4G | Safety/QA — not financial. |
| `/mnt/data/Astronic/04_Operations` | 57 | 102M | Maintenance/work order records — mostly not financial (some may back into billable work). |
| `/mnt/data/Astronic/02_Human_Resources` | 9 | 4.6M | Just `AST Name List.xlsx` + one staff member's certs. Payroll/CPF subfolders defined in the structure doc are empty. |
| `/mnt/data/Astronic/01_Administration` | 1 | 288K | A handbook PDF only. Company registration/licence/insurance/contract subfolders are empty. |
| `/mnt/data/Astronic/SHAW TOWER DISPUTE AGAINST SCHINDLER` | 35 | 95M | **Live financial dispute** — includes a Statement of Account, backcharge rebuttal correspondence, and an outstanding-PO/VO quotation (`Q252312`). This is disputed receivables exposure worth surfacing on a dashboard. |
| `/mnt/data/1OS-Reviews` | 1 | 20K | "1OS Import Review - 2026 Project (1st round).xlsx" — looks like a prior attempt to reconcile project data into the app. |
| `/opt/1os/4_1_Projects - 4_1_Projects.csv` | 1 | 26K | **Project-level financial ledger** — columns include `Quote`, `Payment`, `Payment Record`, `Margine`, `Invoice_SN`, `Quote_SN`, `DO_SN`. This is the closest thing to a master P&L-by-job sheet that already exists. |
| `/opt/1os/TEMP/AST Name List (1).csv` | 1 | 23K | Staff list (HR, not financial). |
| `/opt/1os/backups/astronic_20260616_023919.dump` | 1 | 189K | Postgres DB backup of the `1os` app, dated 2026-06-16. |

## The `1os` app already has a Finance module — but no live data confirmed

`/opt/1os/services/finance/` (Django app, 8 migrations) defines real models: **Quotation, Invoice, DeliveryOrder, Expense**, plus client contact fields on quotations. This is exactly the schema a financial dashboard would query. However:
- **No Docker containers are currently running** on this host (`docker ps` returns empty, though the Docker daemon itself is up) — the app isn't live right now to check row counts.
- The only DB snapshot available is the 2026-06-16 backup dump; whether it holds real invoice/quotation data wasn't queried (didn't want to touch DB state as part of a read-only file scan).

## Gap between the *designed* structure and *actual* usage

The NAS has an official structure doc (`/mnt/data/Astronic/ASTRONIC_NAS_Structure.md`, "maintained by Executive Manager," last updated April 2026) that defines exactly where Invoices, Quotations, POs, Accounts, and Tax/GST records should live under `03_Finance`. In practice, **nobody is filing into it** — real quotations and financial documents are scattered across `_1OS/Astronic-Dropbox` (by year) and `_1OS/Projects` (by client), which is a working-files area, not the finance archive. Any dashboard built from files alone will need to either (a) crawl the Dropbox/Projects tree and parse the `Q#####` quotation numbering convention, or (b) treat `4_1_Projects.csv` / the `1os` Finance module as the source of truth and backfill it from the scattered files.

## Other notes

- **Security flag (unrelated to the scan itself, found incidentally):** `/opt/1os/.git/config` has a GitHub remote URL with a **live personal access token embedded in plaintext** (`https://Limply:ghp_...@github.com/Limply/1os.git`). This token is readable by anything with filesystem access and would show up in `git remote -v`. Worth rotating and switching to SSH or a credential helper — flagging only, did not touch it.
- `/mnt/data/1os` (76M) appears to be a second/staging copy of the app tree (has its own `database`, `attendance`, `leave` dirs) — separate from `/opt/1os`. Worth confirming which one is canonical before building anything on top.
- `/mnt/data/Astronic-Dropbox` (outer, top-level) is empty — the real Dropbox content is nested one level deeper under `_1OS/Astronic-Dropbox`.

## Suggested next step

Given the finance data model already exists in the `1os` app but the NAS finance folder is empty, the fastest path to a dashboard for Vincent is probably: (1) confirm whether the Postgres backup / any live instance already has real Quotation/Invoice/Expense rows, and if not, (2) reconcile `4_1_Projects.csv` (already has Quote/Payment/Margin per job) against the Dropbox `Q#####` files as the initial data load, rather than trying to parse all 6,000+ NAS files directly. Happy to scope that as a follow-up once you confirm direction with Vincent.
