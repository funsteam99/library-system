param(
  [string]$Database = "library_system",
  [string]$Username = "postgres",
  [string]$Host = "localhost",
  [int]$Port = 5432
)

$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot

Write-Host "Starting full backup..."

& (Join-Path $scriptRoot "backup-db.ps1") `
  -Database $Database `
  -Username $Username `
  -Host $Host `
  -Port $Port

& (Join-Path $scriptRoot "backup-uploads.ps1")

Write-Host "Full backup completed."
