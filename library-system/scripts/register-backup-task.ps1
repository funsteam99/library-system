param(
  [string]$TaskName = "LibrarySystemDailyBackup",
  [string]$Database = "library_system",
  [string]$Username = "postgres",
  [string]$Host = "localhost",
  [int]$Port = 5432,
  [string]$DailyAt = "21:00"
)

$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot
$backupScript = Join-Path $scriptRoot "run-backup.ps1"

if (-not (Test-Path -LiteralPath $backupScript)) {
  throw "Backup runner not found: $backupScript"
}

$time = [DateTime]::ParseExact($DailyAt, "HH:mm", $null)
$argument = "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`" -Database `"$Database`" -Username `"$Username`" -Host `"$Host`" -Port $Port"

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argument
$trigger = New-ScheduledTaskTrigger -Daily -At $time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Daily backup for Library System database and uploads" `
  -Force | Out-Null

Write-Host "Scheduled task registered: $TaskName at $DailyAt"
