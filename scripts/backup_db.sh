#!/usr/bin/env bash
#
# 1OS database backup — run on each server (it backs up THAT server's own DB).
# Reads DB credentials from the repo's gitignored .env, writes a timestamped
# PostgreSQL custom-format dump to ~/backups/ and prunes to the last 14.
#
# Usage:
#   ./scripts/backup_db.sh              # back up the DB named in .env
#   BACKUP_DIR=/mnt/x ./scripts/backup_db.sh   # override destination
#
# Custom format (.dump) restores with:
#   pg_restore -h localhost -U <user> -d <db> --clean --if-exists <file>
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -f "$REPO_DIR/.env" ]]; then
  echo "ERROR: $REPO_DIR/.env not found — cannot read DB credentials." >&2
  exit 1
fi

# Load DB_* vars from .env
set -a
# shellcheck disable=SC1091
source "$REPO_DIR/.env"
set +a

: "${DB_NAME:?DB_NAME not set in .env}"
: "${DB_USER:?DB_USER not set in .env}"

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
RETAIN="${RETAIN:-14}"
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/${DB_NAME}_${STAMP}.dump"

echo "Backing up '$DB_NAME' on ${DB_HOST:-localhost}:${DB_PORT:-5432} -> $FILE"
PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
  -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "$DB_USER" \
  -Fc "$DB_NAME" > "$FILE"

echo "Done: $FILE ($(du -h "$FILE" | cut -f1))"

# Retention: keep the newest $RETAIN dumps for this DB, delete older ones.
ls -1t "$BACKUP_DIR/${DB_NAME}_"*.dump 2>/dev/null | tail -n +"$((RETAIN + 1))" | while read -r old; do
  echo "Pruning old backup: $old"
  rm -f "$old"
done
