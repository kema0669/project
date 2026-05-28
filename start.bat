@echo off
setlocal
chcp 65001 >nul

set "ROOT=%~dp0"

echo.
echo [1/4] Checking Node.js and npm...
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js 20 or newer, then run this file again.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please install Node.js 20 or newer, then run this file again.
  pause
  exit /b 1
)

echo.
echo [2/4] Installing backend dependencies...
pushd "%ROOT%backend"
call npm.cmd install
if errorlevel 1 (
  popd
  pause
  exit /b 1
)
popd

echo.
echo [3/4] Installing frontend dependencies...
pushd "%ROOT%frontend"
call npm.cmd install
if errorlevel 1 (
  popd
  pause
  exit /b 1
)
popd

echo.
echo [4/4] Preparing database and starting services...
if not exist "%ROOT%backend\data" mkdir "%ROOT%backend\data"
if not exist "%ROOT%backend\data\cdi.db" (
  pushd "%ROOT%backend"
  call npm.cmd run seed
  if errorlevel 1 (
    popd
    pause
    exit /b 1
  )
  popd
) else (
  echo Database already exists.
)

start "Cognitive Diagnosis API" /D "%ROOT%backend" cmd /k npm.cmd start
timeout /t 3 /nobreak >nul
start "Cognitive Diagnosis Web" /D "%ROOT%frontend" cmd /k npm.cmd run dev
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo App is starting:
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:5173
echo.
echo Close the two service windows when you want to stop the app.
pause
