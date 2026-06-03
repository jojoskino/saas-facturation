# LAFACTURE — Frontend

Application React (Vite) : landing, authentification, espace facturation (devis, factures, clients, rapports).

## Développement

```powershell
npm install
npm run dev
```

API locale attendue sur `http://127.0.0.1:8000` (`php artisan serve` dans `backend/`).

En local, **ne définissez pas** `VITE_API_BASE_URL` dans `.env` : le proxy Vite redirige `/api` vers le backend (évite les erreurs CORS).

## Tests

```powershell
npm run test          # Vitest (unitaires / composants)
npm run build         # build production
npm run test:e2e      # Playwright (nécessite le build)
npm run test:watch    # Vitest en mode watch
```

Première exécution E2E :

```powershell
npx playwright install chromium
```

Voir aussi [TESTING.md](../TESTING.md) à la racine du dépôt.

## Mot de passe oublié (local)

Configurer le backend avec `MAIL_MAILER=log` — voir [MAIL-SETUP.md](../MAIL-SETUP.md) et [TESTING.md](../TESTING.md).

## Build

```powershell
npm run build
npm run preview
```

Sortie : `dist/` (déployée sur Vercel).
