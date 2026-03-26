param(
  [string]$Database = "library_system",
  [string]$Username = "postgres",
  [string]$Host = "localhost",
  [int]$Port = 5432,
  [string]$OutputRoot = "backups\\db"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $repoRoot $OutputRoot

if (-not (Test-Path -LiteralPath $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$filePath = Join-Path $outputDir "$Database-$timestamp.sql"

pg_dump `
  --host $Host `
  --port $Port `
  --username $Username `
  --dbname $Database `
  --file $filePath `
  --encoding UTF8 `
  --no-owner `
  --no-privileges

Write-Host "Database backup created: $filePath"
