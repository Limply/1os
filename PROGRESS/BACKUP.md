# 1OS — Database Backup & Restore

The database is the only piece of 1OS that is **not** recoverable from git. Each
server (SE / Astronic, dev / prod) has its own PostgreSQL database, so **each
server backs up its own DB**. Backups are never committed to git.

## What / where

- **Script:** `scripts/backup_db.sh` (tracked in git; identical on every server).
- **Reads creds from:** the gitignored `.env` (`DB_NAME`, `DB_USER`, `DB_PASSWORD`,
  `DB_HOST`, `DB_PORT`) — so it always targets that server's own DB.
- **Output:** `~/backups/<DB_NAME>_<YYYYMMDD_HHMMSS>.dump`
  (PostgreSQL custom format, `pg_dump -Fc`).
- **Retention:** keeps the newest 14 dumps per DB; older ones are pruned
  automatically (override with `RETAIN=N`).

## Run a backup

```bash
cd <repo>            # SE dev: /home/lucus/1os-dev   |   SE prod: /opt/1os
./scripts/backup_db.sh
```

## When to back up — REQUIRED before:

- **Any deploy that runs `migrate`**, especially on **prod**.
- **Any destructive / data migration** (e.g. the 2026-06-21 Client→Organisation
  unification, which dropped FK columns and is irreversible from the migration
  alone).

Take the backup, confirm the `.dump` file exists and is non-trivial in size,
*then* run the migration.

## Restore

Custom-format dumps restore with `pg_restore`:

```bash
# Restore into the existing DB, replacing matching objects:
PGPASSWORD=<pw> pg_restore -h localhost -U <DB_USER> -d <DB_NAME> \
  --clean --if-exists ~/backups/<DB_NAME>_<stamp>.dump

# Or a clean restore into a fresh DB:
PGPASSWORD=<pw> dropdb   -h localhost -U <DB_USER> <DB_NAME>
PGPASSWORD=<pw> createdb -h localhost -U <DB_USER> <DB_NAME>
PGPASSWORD=<pw> pg_restore -h localhost -U <DB_USER> -d <DB_NAME> ~/backups/<DB_NAME>_<stamp>.dump
```

## Automate (optional, per server)

Daily 02:00 backup via cron:

```cron
0 2 * * * cd /home/lucus/1os-dev && ./scripts/backup_db.sh >> ~/backups/backup.log 2>&1
```

## Backup history (manual log)

| Date (SGT) | Server / DB | File | Note |
|---|---|---|---|
| 2026-06-21 16:23 | SE dev / `1os_db` | `1os_db_20260621_162358.dump` | ~6 min before Client→Org migration (pre-unification snapshot) |
| 2026-06-22 17:25 | SE dev / `1os_db` | `1os_db_20260622_172529.dump` | first run of `scripts/backup_db.sh` (current dev state) |
