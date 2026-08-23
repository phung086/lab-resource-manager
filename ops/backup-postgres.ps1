param(
  [string]$OutputDir = "backups",
  [string]$ComposeFile = "docker-compose.prod.yml",
  [string]$EnvFile = ".env.production"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$targetDir = Join-Path (Get-Location) $OutputDir
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$postgresContainer = docker compose --env-file $EnvFile -f $ComposeFile ps -q postgres
if (-not $postgresContainer) {
  throw "Postgres container was not found. Start the production stack before backup."
}

$envValues = Get-Content $EnvFile | Where-Object { $_ -match "^[^#=]+=" } | ForEach-Object {
  $parts = $_ -split "=", 2
  @{ Key = $parts[0].Trim(); Value = $parts[1].Trim() }
}

$postgresDb = ($envValues | Where-Object { $_.Key -eq "POSTGRES_DB" }).Value
$postgresUser = ($envValues | Where-Object { $_.Key -eq "POSTGRES_USER" }).Value
if (-not $postgresDb -or -not $postgresUser) {
  throw "POSTGRES_DB and POSTGRES_USER must be set in $EnvFile."
}

$backupFile = Join-Path $targetDir "$postgresDb-$timestamp.dump"
docker exec $postgresContainer pg_dump -U $postgresUser -d $postgresDb -Fc -f /tmp/lrm-backup.dump
docker cp "${postgresContainer}:/tmp/lrm-backup.dump" $backupFile
docker exec $postgresContainer rm -f /tmp/lrm-backup.dump | Out-Null

Write-Host "Backup created: $backupFile"
