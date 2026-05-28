$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "$name was not found. Please install Node.js 20 or newer, then run this script again."
  }
}

Write-Host ''
Write-Host '[1/4] Checking Node.js and npm...'
Require-Command node
Require-Command npm.cmd

Write-Host ''
Write-Host '[2/4] Installing backend dependencies...'
$backend = Join-Path $root 'backend'
Push-Location $backend
npm.cmd install
Pop-Location

Write-Host ''
Write-Host '[3/4] Installing frontend dependencies...'
$frontend = Join-Path $root 'frontend'
Push-Location $frontend
npm.cmd install
Pop-Location

Write-Host ''
Write-Host '[4/4] Preparing database and starting services...'
$dataDir = Join-Path $backend 'data'
$dbPath = Join-Path $dataDir 'cdi.db'
if (-not (Test-Path $dataDir)) {
  New-Item -ItemType Directory -Path $dataDir | Out-Null
}
if (-not (Test-Path $dbPath)) {
  Push-Location $backend
  npm.cmd run seed
  Pop-Location
} else {
  Write-Host 'Database already exists.'
}

Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', 'npm.cmd start' -WorkingDirectory $backend
Start-Sleep -Seconds 3
Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', 'npm.cmd run dev' -WorkingDirectory $frontend
Start-Sleep -Seconds 3
Start-Process 'http://localhost:5173'

Write-Host ''
Write-Host 'App is starting:'
Write-Host '  Backend:  http://localhost:3000'
Write-Host '  Frontend: http://localhost:5173'
Write-Host ''
Write-Host 'Close the two service windows when you want to stop the app.'
