#!/usr/bin/env sh
set -eu

OUTPUT_DIR="${OUTPUT_DIR:-backups}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
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
  echo "Postgres container was not found. Start the production stack before backup." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
BACKUP_FILE="$OUTPUT_DIR/$POSTGRES_DB-$TIMESTAMP.dump"

docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/lrm-backup.dump
docker cp "$POSTGRES_CONTAINER:/tmp/lrm-backup.dump" "$BACKUP_FILE"
docker exec "$POSTGRES_CONTAINER" rm -f /tmp/lrm-backup.dump >/dev/null

echo "Backup created: $BACKUP_FILE"
