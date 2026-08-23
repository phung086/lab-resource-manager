#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ] || [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
  echo "Usage: CONFIRM_RESTORE=yes $0 path/to/backup.dump" >&2
  echo "Restore replaces database contents; verify the backup before running." >&2
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

POSTGRES_DB="$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2-)"
POSTGRES_USER="$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2-)"
if [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ]; then
  echo "POSTGRES_DB and POSTGRES_USER must be set in $ENV_FILE." >&2
  exit 1
fi

POSTGRES_CONTAINER="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q postgres)"
if [ -z "$POSTGRES_CONTAINER" ]; then
  echo "Postgres container was not found. Start the production stack before restore." >&2
  exit 1
fi

docker cp "$BACKUP_FILE" "$POSTGRES_CONTAINER:/tmp/lrm-restore.dump"
docker exec "$POSTGRES_CONTAINER" sh -c "pg_restore -U '$POSTGRES_USER' -d '$POSTGRES_DB' --clean --if-exists /tmp/lrm-restore.dump"
docker exec "$POSTGRES_CONTAINER" rm -f /tmp/lrm-restore.dump >/dev/null

echo "Restore completed from: $BACKUP_FILE"
