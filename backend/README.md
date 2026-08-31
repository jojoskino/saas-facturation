# LAFACTURE — Backend

API Laravel (Sanctum) : authentification, clients, devis, factures, paiements, PDF, rapports.

## Installation

```powershell
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
```

Base SQLite par défaut (`database/database.sqlite` créée automatiquement au premier migrate).

## Développement

```powershell
php artisan serve
```

L’API écoute sur http://127.0.0.1:8000.

## Tests

```powershell
php artisan test
```

Voir [TESTING.md](../TESTING.md) à la racine du dépôt.

## Documentation API

Swagger UI disponible après démarrage (voir `config/l5-swagger.php`).
