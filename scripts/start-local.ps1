$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $root 'server'
$databaseUrl = 'postgresql://postgres:postgres@localhost:5432/opticycle?schema=public'

function Invoke-Npm {
  param(
    [string[]]$Arguments,
    [string]$WorkingDirectory
  )

  Push-Location $WorkingDirectory
  try {
    & npm.cmd @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "npm command failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

function Test-LocalEndpoint {
  param([string]$Uri)

  try {
    $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker Desktop is required. Install and start Docker Desktop, then run this command again.'
}

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
  Invoke-Npm -Arguments @('ci', '--prefer-offline', '--no-audit', '--no-fund') -WorkingDirectory $root
}

if (-not (Test-Path (Join-Path $serverDir 'node_modules'))) {
  Invoke-Npm -Arguments @('ci', '--prefer-offline', '--no-audit', '--no-fund') -WorkingDirectory $serverDir
}

Push-Location $root
try {
  & docker compose up -d postgres
  if ($LASTEXITCODE -ne 0) {
    throw 'Could not start PostgreSQL. Check that Docker Desktop is running.'
  }
} finally {
  Pop-Location
}

$deadline = (Get-Date).AddSeconds(90)
do {
  $health = & docker inspect --format '{{.State.Health.Status}}' opticycle-postgres 2>$null
  if ($health -eq 'healthy') {
    break
  }
  if ((Get-Date) -ge $deadline) {
    throw 'PostgreSQL did not become healthy within 90 seconds.'
  }
  Start-Sleep -Seconds 2
} while ($true)

$env:DATABASE_URL = $databaseUrl
$env:JWT_SECRET = 'local-development-only'
if (-not (Test-Path (Join-Path $serverDir 'node_modules\.prisma\client\index.js'))) {
  Invoke-Npm -Arguments @('run', 'prisma:generate') -WorkingDirectory $serverDir
}
Invoke-Npm -Arguments @('run', 'prisma:deploy') -WorkingDirectory $serverDir

if (-not (Test-LocalEndpoint -Uri 'http://localhost:4000/health')) {
  $apiCommand = "Set-Location -LiteralPath '$serverDir'; `$env:DATABASE_URL='$databaseUrl'; `$env:JWT_SECRET='local-development-only'; npm.cmd run dev"
  Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-NoExit', '-Command', $apiCommand) -WorkingDirectory $serverDir
} else {
  Write-Output 'API is already responding at http://localhost:4000; reusing it.'
}

if (-not (Test-LocalEndpoint -Uri 'http://localhost:5173')) {
  $webCommand = "Set-Location -LiteralPath '$root'; npm.cmd run dev"
  Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-NoExit', '-Command', $webCommand) -WorkingDirectory $root
} else {
  Write-Output 'Frontend is already responding at http://localhost:5173; reusing it.'
}

Write-Output 'OptiCycle is ready: http://localhost:5173'
