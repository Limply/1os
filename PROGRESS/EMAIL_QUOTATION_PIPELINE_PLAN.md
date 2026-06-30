# 1OS ↔ Zoho Mail → Quotation Pipeline — Plan

**Status:** Plan drafted 2026-06-27, not yet built. **Provider: Zoho Mail** (not Gmail). Scope: individual user mailboxes.
**Related:** [[project_1os_nas_integration]] (archive target), CRM module (Lead/Contact/Interaction), finance (Quotation).

---

## Goal
Read staff Zoho mailboxes, **archive** mail to the NAS, make it **searchable** in 1OS, **link** mail to
clients/projects, and — for incoming enquiries — **extract requirements, auto-draft a Quotation, and
notify the user** to review and send. Drafts only; **never auto-sends**.

## Pipeline
```
Zoho mailbox
   │ (1) poll / IMAP sync           ← per-account, scheduled
   ▼
Ingest ─(2)─► Archive .eml + attachments → NAS  (/mnt/data/1os/SE-Bizz/_Email/<account>/<YYYY-MM>/)
   │        └► Index metadata in DB (ArchivedEmail) — searchable in 1OS
   ▼
(3) Classify: is this an RFQ / enquiry?                    ← Claude Haiku 4.5
   ▼ yes
(4) Extract requirements (scope items, qty, site, deadline) ← Claude Opus 4.8 (structured output)
   ▼
(5) Match / create Client + Lead + Interaction (CRM)
   ▼
(6) Create Project (gets SE-YY-NNN)
   ▼
(7) Draft Quotation: map requirements → catalog items → prices from DB ← Claude Opus 4.8
   ▼
(8) Notify user → review draft in 1OS → reply with quote
```

## Reading Zoho Mail
- **Phase-1 start: IMAP + app-specific password** (`imaplib`, stdlib). Enable IMAP in Zoho settings;
  generate an app password (required with 2FA). Simplest path; one account at a time.
- **Later: Zoho Mail REST API + OAuth2** (scope `ZohoMail.messages.READ`) for cleaner token handling.
  ⚠️ API domain is **region-specific** (zoho.com / .in / .eu — confirm the account's data center).
- Zoho push is weak → **poll on a schedule** (cron/management command) or IMAP IDLE. No webhooks.

---

## Phases (build in order — de-risk)

### Phase 1 — Ingest + Archive + Search (no AI)
- New app `services/email_intake/` (per the multi-dev guide; standalone, links by `project_no`/loose ref).
- `EmailAccount` model (provider, address, IMAP host, encrypted app-password, last_uid/last sync).
- `sync_mailbox` management command (cron): pull new messages, write `.eml` + attachments to NAS, index.
- `ArchivedEmail` model: message_id, account, from/to/cc, subject, date, body_preview, thread_id,
  nas_path, has_attachments, linked_client/project (nullable). Full-text search in 1OS.
- Frontend: an **Email** tab (list + read), `Array.isArray` guard + inline errors.

### Phase 2 — CRM / Project linking
- Match sender → existing `organisation.Client` (by email domain / address); create `crm.Lead` +
  `crm.Interaction` from the email. Manual **"Convert to Project"** button → creates `projects.Project`.
- Show linked emails on the Client and Project pages (ties into the NAS Files tab).

### Phase 3 — AI quotation drafting
- **Product catalog** (new `finance.Product` / `PriceListItem`: code, description, unit, unit_price, category).
  This is the **pricing source** (decided 2026-06-27) — the LLM never invents prices.
- Classify → extract → draft (see AI design below) → create **draft `Quotation` + `QuotationItem`s** →
  `notifications.Notification` to the user with a link to review. User edits prices/scope and sends.

---

## New / reused models
| Model | Where | Purpose |
|---|---|---|
| `EmailAccount` | email_intake (new) | per-user mailbox creds + sync state |
| `ArchivedEmail` (+ `EmailAttachment`) | email_intake (new) | indexed archive, links to client/project |
| `Product` / `PriceListItem` | finance | **catalog = pricing source** for drafts |
| `Lead`, `Contact`, `Interaction` | crm (existing) | enquiry → pipeline |
| `Project` | projects (existing) | auto-created on convert |
| `Quotation`, `QuotationItem` | finance (existing) | the draft output |
| `Notification` | notifications (existing) | "review this draft quote" |

---

## AI design (Phase 3) — Claude via `anthropic` Python SDK

> Verified against the claude-api skill (2026-06-27). This is a **code-orchestrated workflow**, not an
> agent — three single/structured LLM calls glued by our own Python. No agent framework needed.

**Step 3 — Classify "is this an RFQ?"** — cheap/fast model:
```python
client.messages.create(model="claude-haiku-4-5", max_tokens=256,
    messages=[{"role": "user", "content": classify_prompt(email)}])
```

**Step 4 — Extract requirements** — structured output (Pydantic) on the default capable model:
```python
resp = client.messages.parse(model="claude-opus-4-8", max_tokens=16000,
    output_format=RequirementSpec,   # Pydantic: client, site, line_items[{description, qty, unit}], deadline, notes
    messages=[{"role": "user", "content": extract_prompt(email_body)}])
spec = resp.parsed_output
```

**Step 7 — Draft quotation, prices from DB (no hallucinated $):**
- Pass the **catalog as cached context** and have the model return **catalog_item_id + qty** per line,
  not prices. Backend looks up `unit_price` from the DB → totals are always real.
- Cache the (large, stable) catalog + system prompt → ~90% cheaper on repeat calls:
```python
resp = client.messages.parse(model="claude-opus-4-8", max_tokens=16000,
    thinking={"type": "adaptive"},          # better mapping quality
    system=[{"type": "text", "text": SYSTEM + CATALOG_TEXT,
             "cache_control": {"type": "ephemeral"}}],
    output_format=QuoteDraft,               # line_items[{catalog_item_id, qty, note}], unmatched[]
    messages=[{"role": "user", "content": draft_prompt(spec)}])
```
- Items the model can't confidently map → `unmatched[]` → created as **$0 "NEEDS PRICING"** lines for the
  user to fill. Never guess a price.

**Models (current, per skill):** `claude-haiku-4-5` (classify), `claude-opus-4-8` (extract + draft).
**Key settings:** structured outputs via `messages.parse(output_format=...)`; adaptive thinking on the
draft; prompt-cache the catalog; `max_tokens≈16000`. Config `ANTHROPIC_API_KEY` in `.env`.

---

## Security / privacy
- **Data egress:** email bodies are sent to the Anthropic API for steps 3/4/7 — **explicitly OK'd by user
  (2026-06-27).** Consider redacting obvious secrets before send; classify with Haiku first so non-RFQ
  mail never reaches the heavier extract/draft calls.
- Store mailbox app-passwords **encrypted at rest**; never log them.
- Drafts are **never auto-sent** — human reviews and sends every quote.
- Archive writes go to the same NAS tree as [[project_1os_nas_integration]] (`/mnt/data/1os/SE-Bizz`).

## Config
- `.env`: `ANTHROPIC_API_KEY`, per-account IMAP creds (or Zoho OAuth client), `ZOHO_REGION`.
- Sync cadence: management command on cron (e.g. every 5–10 min).

## Open items / decisions
- Confirm Zoho **data center/region** (zoho.com vs .in/.eu) for IMAP host / future API domain.
- Confirm the **monitored mailbox(es)** (which staff accounts).
- Build & maintain the **product catalog** (the pricing source) — who populates it, how often.
- Email archive folder convention under SE-Bizz (`_Email/<account>/<YYYY-MM>/` vs per-project).
- RRFQ detection threshold / which senders to auto-process vs ignore (newsletters, internal mail).

---

*Plan only — no code yet. Follow [[feedback_ask_before_coding]] before building any phase.*
