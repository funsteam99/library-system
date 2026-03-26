param(
  [string]$Source = "backend\\uploads",
  [string]$OutputRoot = "backups\\uploads"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $repoRoot $Source
$outputDir = Join-Path $repoRoot $OutputRoot

if (-not (Test-Path -LiteralPath $sourceDir)) {
  throw "Uploads directory not found: $sourceDir"
}

if (-not (Test-Path -LiteralPath $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipPath = Join-Path $outputDir "uploads-$timestamp.zip"

Compress-Archive -Path (Join-Path $sourceDir "*") -DestinationPath $zipPath -Force

Write-Host "Uploads backup created: $zipPath"
