#Requires -Version 5.1
<#
  Crea los roles `dream_library` (app) y `dream_library_admin` (superuser) y la DB `dream_library`
  en el Postgres local. Te pedira el password actual del superusuario `postgres`
  para autenticarse; tras ejecutarlo no se queda en disco.

  Uso (desde la raiz del repo):
    powershell -ExecutionPolicy Bypass -File scripts/init-postgres.ps1
#>

$ErrorActionPreference = 'Stop'

$candidatePsql = @(
  'C:\Program Files\PostgreSQL\18\bin\psql.exe',
  'C:\Program Files\PostgreSQL\17\bin\psql.exe',
  'C:\Program Files\PostgreSQL\16\bin\psql.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $candidatePsql) {
  throw "No encuentro psql.exe en C:\Program Files\PostgreSQL\<version>\bin. Ajusta la ruta en este script."
}

$sqlFile = Join-Path $PSScriptRoot 'init-postgres.sql'
if (-not (Test-Path $sqlFile)) {
  throw "Falta $sqlFile. Genera el SQL antes de ejecutar este wrapper."
}

Write-Host "Usando psql: $candidatePsql" -ForegroundColor Cyan
Write-Host ""
$secure = Read-Host "Password actual del superusuario 'postgres'" -AsSecureString
$plain  = [System.Net.NetworkCredential]::new('', $secure).Password

$env:PGPASSWORD = $plain
try {
  & $candidatePsql -U postgres -h localhost -d postgres -f $sqlFile
  if ($LASTEXITCODE -ne 0) {
    throw "psql termino con codigo $LASTEXITCODE"
  }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Listo. Ya puedes apuntar Dream Library a postgres://dream_library:<pw>@localhost:5432/dream_library" -ForegroundColor Green
