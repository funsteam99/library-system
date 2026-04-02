@echo off
setlocal

set "ROOT=C:\Users\user\Documents\Playground\library-system"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"
set "NODE_EXE=C:\nvm4w\nodejs\node.exe"

if not exist "%NODE_EXE%" (
  echo [ERROR] Node executable not found: %NODE_EXE%
  exit /b 1
)

echo [INFO] Starting backend window...
start "Library Backend" cmd /k "cd /d %BACKEND% && %NODE_EXE% dist\server.js"

echo [INFO] Building frontend...
cd /d "%FRONTEND%"
call npm run build
if errorlevel 1 (
  echo [ERROR] Frontend build failed.
  exit /b 1
)

echo [INFO] Starting frontend window...
start "Library Frontend" cmd /k "cd /d %FRONTEND% && %NODE_EXE% .\node_modules\next\dist\bin\next start -p 3000"

echo [OK] Services launched in two windows.
echo [OK] Open: http://localhost:3000/mobile/books

endlocal
