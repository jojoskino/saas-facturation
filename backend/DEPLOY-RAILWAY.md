# Backend Laravel sur Railway (CLI)

**Pourquoi Railway ?** Bon support PHP/Laravel, PostgreSQL intégré, CLI simple, HTTPS automatique.  
**Alternatives équivalentes :** [Render](https://render.com), [Fly.io](https://fly.io) (plus technique), [Laravel Cloud](https://cloud.laravel.com).

---

## Prérequis

```powershell
npm install -g @railway/cli
railway login
```

---

## 1. Créer le projet (une seule fois)

```powershell
cd "c:\Mes projets\saas-facturation\backend"
railway init
```

Choisir : **Create new project** → nom ex. `facturo-api`.

---

## 2. PostgreSQL

```powershell
railway add --database postgres
```

Railway injecte `DATABASE_URL` sur le service web (à lier si besoin : Variables → référencer `${{Postgres.DATABASE_URL}}`).

---

## 3. Variables d'environnement

Générer une clé Laravel :

```powershell
php artisan key:generate --show
```

Copier la valeur `base64:...` puis :

```powershell
railway variables set APP_NAME=Facturo
railway variables set APP_ENV=production
railway variables set APP_DEBUG=false
railway variables set APP_KEY="base64:VOTRE_CLE_ICI"
railway variables set LOG_CHANNEL=stderr
railway variables set LOG_LEVEL=info
railway variables set DB_CONNECTION=pgsql
railway variables set SESSION_DRIVER=database
railway variables set CACHE_STORE=database
railway variables set QUEUE_CONNECTION=sync
railway variables set FILESYSTEM_DISK=local
railway variables set BILLING_MODE=simulation
```

Après le premier déploiement, récupérer l’URL publique :

```powershell
railway domain
```

Puis définir (remplacer les URLs) :

```powershell
railway variables set APP_URL="https://votre-service.up.railway.app"
railway variables set FRONTEND_URL="https://votre-projet.vercel.app"
railway variables set CORS_ALLOWED_ORIGINS="https://votre-projet.vercel.app"
railway variables set L5_SWAGGER_CONST_HOST="https://votre-service.up.railway.app"
```

Stripe (optionnel) :

```powershell
railway variables set STRIPE_SECRET="sk_live_..."
railway variables set STRIPE_WEBHOOK_SECRET="whsec_..."
railway variables set STRIPE_PRICE_PRO="price_..."
```

---

## 4. Déployer

Depuis `backend/` :

```powershell
railway up
```

Ou lier GitHub (déploiement auto à chaque push sur `main`, dossier `backend`) :

```powershell
railway service link
# Puis dans le dashboard : Settings → Connect Repo → Root Directory = backend
```

---

## 5. Lier le frontend Vercel

```powershell
cd "c:\Mes projets\saas-facturation\frontend"
vercel env add VITE_API_BASE_URL production
# Valeur = APP_URL Railway (sans slash final)
vercel --prod
```

---

## Commandes utiles

```powershell
railway status
railway logs
railway open
railway variables
railway run php artisan migrate:status
railway run php artisan tinker
```

---

## Dépannage

| Erreur | Solution |
|--------|----------|
| `Unauthorized` | `railway login` |
| 503 base de données | Vérifier Postgres actif + `DATABASE_URL` + `DB_CONNECTION=pgsql` |
| CORS | Ajouter l’URL Vercel exacte dans `CORS_ALLOWED_ORIGINS` |
| Fichiers / logos perdus au redéploiement | Disque éphémère : prévoir S3 ou volume Railway plus tard |
| Build Composer | Vérifier PHP 8.3 dans `composer.json` |
