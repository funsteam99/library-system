param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$Database = "library_system",
  [string]$Username = "postgres",
  [string]$Host = "localhost",
  [int]$Port = 5432
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

psql `
  --host $Host `
  --port $Port `
  --username $Username `
  --dbname $Database `
  --file $BackupFile

Write-Host "Database restore completed from: $BackupFile"
