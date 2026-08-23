param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$ComposeFile = "docker-compose.prod.yml",
  [string]$EnvFile = ".env.production",
  [switch]$ConfirmRestore
)

$ErrorActionPreference = "Stop"

if (-not $ConfirmRestore) {
  throw "Restore will replace database contents. Re-run with -ConfirmRestore after verifying the backup file."
}

$resolvedBackup = (Resolve-Path -LiteralPath $BackupFile).Path
$postgresContainer = docker compose --env-file $EnvFile -f $ComposeFile ps -q postgres
if (-not $postgresContainer) {
  throw "Postgres container was not found. Start the production stack before restore."
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

docker cp $resolvedBackup "${postgresContainer}:/tmp/lrm-restore.dump"
docker exec $postgresContainer sh -c "pg_restore -U $postgresUser -d $postgresDb --clean --if-exists /tmp/lrm-restore.dump"
docker exec $postgresContainer rm -f /tmp/lrm-restore.dump | Out-Null

Write-Host "Restore completed from: $resolvedBackup"
