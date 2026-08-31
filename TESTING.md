# Tests LAFACTURE

## Tout lancer (recommandé)

Depuis la racine du dépôt :

```powershell
npm run test:all
```

Sous Windows, n'enchaînez pas `cd backend` puis `cd frontend` : le second `cd` serait relatif à `backend/`. Utilisez `cd ..\frontend` ou les scripts ci-dessus.

## Par couche

```powershell
# Backend (PHPUnit)
cd backend
php artisan test

# Frontend (Vitest)
cd ..\frontend
npm run test

# E2E Playwright (1ère fois : npx playwright install chromium)
cd ..\frontend
npm run build
npm run test:e2e
```

## Mot de passe oublié en local

Dans `backend/.env` :

```env
MAIL_MAILER=log
```

Les e-mails apparaissent dans `backend/storage/logs/laravel.log`.

## Rappels factures en retard

Le toggle « Notifications par e-mail » enregistre la préférence utilisateur. L'envoi automatique nécessite :

- une configuration SMTP (`MAIL_*`) ;
- le planificateur Laravel : `php artisan schedule:work` (dev).
