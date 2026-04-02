@echo off
setlocal

set "BACKEND_DIR=C:\Users\user\Documents\Playground\library-system\backend"
set "NODE_EXE=C:\nvm4w\nodejs\node.exe"

if not exist "%NODE_EXE%" (
  echo [ERROR] Node executable not found: %NODE_EXE%
  exit /b 1
)

start "library-system-backend" /D "%BACKEND_DIR%" "%NODE_EXE%" "dist\server.js"
echo [OK] Backend start command sent.

endlocal
