# Déploiement backend Facturo sur Railway (après `railway login`)
# Usage : .\scripts\deploy-railway.ps1

$ErrorActionPreference = "Stop"
$Backend = (Resolve-Path (Join-Path $PSScriptRoot "..\backend")).Path

Push-Location $Backend
try {
    Write-Host ">> Railway - backend Facturo" -ForegroundColor Cyan
    railway whoami 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Connectez-vous : railway login" -ForegroundColor Yellow
        exit 1
    }

    if (-not (Test-Path ".railway")) {
        Write-Host ">> railway init (créer ou lier un projet)" -ForegroundColor Cyan
        railway init
    }

    Write-Host ">> Ajout PostgreSQL si absent (ignorer l'erreur si déjà créé)" -ForegroundColor Cyan
    railway add --database postgres 2>$null

    $key = (php artisan key:generate --show 2>$null).Trim()
    if ($key) {
        Write-Host ">> APP_KEY générée (à conserver)" -ForegroundColor Green
        railway variables set "APP_KEY=$key" 2>$null
    }

    railway variables set APP_NAME=Facturo APP_ENV=production APP_DEBUG=false `
        LOG_CHANNEL=stderr LOG_LEVEL=info DB_CONNECTION=pgsql `
        SESSION_DRIVER=database CACHE_STORE=database QUEUE_CONNECTION=sync `
        FILESYSTEM_DISK=local BILLING_MODE=simulation 2>$null

    Write-Host ">> Déploiement (railway up)..." -ForegroundColor Cyan
    railway up

    Write-Host ""
    Write-Host ">> URL publique :" -ForegroundColor Green
    railway domain 2>$null
    Write-Host ""
    Write-Host "Puis définir APP_URL, FRONTEND_URL, CORS_ALLOWED_ORIGINS (voir backend/DEPLOY-RAILWAY.md)" -ForegroundColor Yellow
}
finally {
    Pop-Location
}
