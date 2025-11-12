<#
.SYNOPSIS
  Create DB roles (if missing) and set passwords for app_user/admin_user in a safer way.

.DESCRIPTION
  This script sets passwords for the DB roles used by the application. It will
  ensure each role exists (the SQL file `07_users_privs.sql` creates roles
  without passwords) and then sets the password for the specified roles.

  For local development you can pass passwords via parameters or environment
  variables. For CI / production, prefer secrets managers and avoid committing
  passwords in cleartext.

USAGE
  # Interactive prompt for passwords
  .\create_db_roles.ps1 -DbName moviedb

  # Non-interactive (read from env vars APP_DB_PW and ADMIN_DB_PW)
  $env:APP_DB_PW = 'changeme'
  $env:ADMIN_DB_PW = 'changeme2'
  .\create_db_roles.ps1 -DbName moviedb -PgUser postgres

PARAMETER DbName
  The target database name (default: moviedb)

PARAMETER PgUser
  Superuser or a role with permission to ALTER ROLE (default: postgres)

PARAMETER Host
  Database host (default: localhost)

PARAMETER Port
  Database port (default: 5432)

NOTES
  - Requires `psql` available in PATH.
  - Passwords passed on command line may be visible to other users on the system
    (process list). Prefer interactive prompt or environment variables.
#>

param(
  [string]$DbName = 'moviedb',
  [string]$PgUser = 'postgres',
  [string]$Host = 'localhost',
  [int]$Port = 5432,
  [string]$AppUserPw = $env:APP_DB_PW,
  [string]$AdminUserPw = $env:ADMIN_DB_PW
)

function Read-Secret([string]$prompt) {
  $secure = Read-Host -Prompt $prompt -AsSecureString
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

# Prompt if not provided via env/params
if (-not $AppUserPw) { $AppUserPw = Read-Secret 'Password for app_user (will not be stored)'; }
if (-not $AdminUserPw) { $AdminUserPw = Read-Secret 'Password for admin_user (will not be stored)'; }

$psql = 'psql'

Write-Host "Ensuring roles exist (will not set passwords here) and then setting passwords..."

# Ensure roles exist (this mirrors 07_users_privs.sql behavior):
$ensureRolesSql = @"
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_user') THEN
    CREATE ROLE admin_user LOGIN;
  END IF;
END $$;
"@

& $psql -U $PgUser -h $Host -p $Port -d $DbName -v ON_ERROR_STOP=1 -c $ensureRolesSql

# Set passwords (use single quotes safely by escaping any single quotes in pw)
function Escape-SqlString($s) {
  return $s -replace "'", "''"
}

$appPwEsc = Escape-SqlString($AppUserPw)
$adminPwEsc = Escape-SqlString($AdminUserPw)

$alterApp = "ALTER ROLE app_user WITH PASSWORD '$appPwEsc';"
$alterAdmin = "ALTER ROLE admin_user WITH PASSWORD '$adminPwEsc';"

& $psql -U $PgUser -h $Host -p $Port -d $DbName -v ON_ERROR_STOP=1 -c $alterApp
& $psql -U $PgUser -h $Host -p $Port -d $DbName -v ON_ERROR_STOP=1 -c $alterAdmin

Write-Host 'Passwords set. You can now connect as app_user/admin_user to run seeds or run the app.'
