param(
  [string]$PgBin = "C:\Program Files\PostgreSQL\17\bin",
  [string]$DbName = "library_system",
  [string]$DbUser = "postgres",
  [string]$DbPass = "funsteam99",
  [string]$ProjectRoot = "C:\Users\user1\fullon-library-pwa"
)

$ErrorActionPreference = "Stop"
$env:PGPASSWORD = $DbPass
$psql = Join-Path $PgBin "psql.exe"
if (!(Test-Path $psql)) { throw "psql not found: $psql" }

Write-Host "[1/5] Ensure database exists: $DbName"
$exists = & $psql -h 127.0.0.1 -U $DbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'"
if ($exists -notmatch "1") {
  & $psql -h 127.0.0.1 -U $DbUser -d postgres -c "CREATE DATABASE $DbName;"
}

Write-Host "[2/5] Apply schema"
& $psql -h 127.0.0.1 -U $DbUser -d $DbName -f (Join-Path $ProjectRoot "database\db-init.sql")

Write-Host "[3/5] Apply migrations (safe to rerun)"
& $psql -h 127.0.0.1 -U $DbUser -d $DbName -f (Join-Path $ProjectRoot "database\20260320_add_inactive_book_status.sql")
& $psql -h 127.0.0.1 -U $DbUser -d $DbName -f (Join-Path $ProjectRoot "database\20260326_add_staff_user.sql")

Write-Host "[4/5] Seed dev data (safe to rerun)"
& $psql -h 127.0.0.1 -U $DbUser -d $DbName -f (Join-Path $ProjectRoot "database\dev-seed.sql")

Write-Host "[5/5] Smoke check"
& $psql -h 127.0.0.1 -U $DbUser -d $DbName -c "SELECT COUNT(*) AS users_count FROM users;"
& $psql -h 127.0.0.1 -U $DbUser -d $DbName -c "SELECT COUNT(*) AS books_count FROM books;"

Write-Host "DB init completed."
