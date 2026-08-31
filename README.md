# LAFACTURE

Application SaaS de facturation (devis, factures, clients, rapports) — monorepo GitHub.

| Dossier     | Stack              | Rôle                          |
| ----------- | ------------------ | ----------------------------- |
| `frontend/` | React + Vite       | Interface web                 |
| `backend/`  | Laravel + Sanctum  | API REST, PDF, e-mails        |
| `docs/`     | PlantUML, cahiers  | Documentation projet          |

Dépôt : [github.com/jojoskino/saas-facturation](https://github.com/jojoskino/saas-facturation)

## Démarrage rapide (local)

**Terminal 1 — API**

```powershell
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

**Terminal 2 — Frontend**

```powershell
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173

## Tests

Depuis la racine :

```powershell
npm run test:all
```

Détails : [TESTING.md](./TESTING.md)

## Configuration

- **E-mails** (mot de passe oublié, rappels) : [MAIL-SETUP.md](./MAIL-SETUP.md)
- **Variables d’environnement** : `backend/.env.example`, `frontend/.env.example`

## CI

GitHub Actions (`.github/workflows/ci.yml`) : PHPUnit, lint/build frontend, tests E2E Playwright.
