<#
.SYNOPSIS
    Deploys all Supabase Edge Functions to the remote project.

.DESCRIPTION
    Runs `npx supabase functions deploy` from the repo root, which deploys
    every function found under supabase/functions/ (skipping _shared).
    The project must already be linked via `npx supabase link`.

.PARAMETER DryRun
    List the functions that would be deployed without actually deploying.

.EXAMPLE
    .\devops\deploy-edge-functions.ps1
    .\devops\deploy-edge-functions.ps1 -DryRun
#>

param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Resolve paths relative to the repo root (one level up from devops/)
$repoRoot = Split-Path -Parent $PSScriptRoot
$functionsDir = Join-Path (Join-Path $repoRoot "supabase") "functions"

if (-not (Test-Path $functionsDir)) {
    Write-Error "Functions directory not found: $functionsDir"
    exit 1
}

# List discoverable functions for the user
$functions = Get-ChildItem -Path $functionsDir -Directory |
    Where-Object { $_.Name -ne "_shared" } |
    Sort-Object Name

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Supabase Edge Functions Deployment"     -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Found $($functions.Count) function(s):" -ForegroundColor Yellow

foreach ($fn in $functions) {
    Write-Host "  - $($fn.Name)" -ForegroundColor Gray
}

Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] No functions were deployed." -ForegroundColor Magenta
    exit 0
}

Write-Host "Deploying all functions..." -ForegroundColor Cyan
Write-Host ""

Push-Location $repoRoot
try {
    # Supabase CLI writes progress to stderr; prevent PowerShell from treating it as a terminating error
    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    $output = npx supabase functions deploy --use-api 2>&1
    $output | ForEach-Object { Write-Host $_ }

    $ErrorActionPreference = $prevPref

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Deployment FAILED (exit code $LASTEXITCODE)." -ForegroundColor Red
        exit 1
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "All functions deployed successfully!" -ForegroundColor Green
exit 0
