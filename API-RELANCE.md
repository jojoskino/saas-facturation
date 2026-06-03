# Relancer l'API LAFACTURE (backend hors ligne)

Le frontend Vercel **ne peut pas fonctionner sans API** Laravel en ligne.

## État actuel

- **Vercel** : https://saas-facturation.vercel.app — `VITE_API_BASE_URL=https://facturo-api.fly.dev`
- **API Fly.io** : https://facturo-api.fly.dev — Postgres `facturo-db`
- **Local** : `php artisan serve` dans `backend/` (port 8000)

---

## Option 1 — Fly.io (production actuelle)

Si la connexion affiche « service indisponible », la base Postgres est souvent **arrêtée** (machine suspendue).

```powershell
# 1. Vérifier l'état
flyctl status -a facturo-db
flyctl status -a facturo-api

# 2. Relancer Postgres si STATE = stopped
flyctl machine list -a facturo-db
flyctl machine start <ID> -a facturo-db

# 3. Attendre CHECKS = passing, puis redémarrer l'API
flyctl machine list -a facturo-api
flyctl machine restart <ID> -a facturo-api

# 4. Vérifier
curl.exe https://facturo-api.fly.dev/up
```

Réponse HTML « Application up » = API OK.

---

## Option 2 — Render (alternative)

1. [render.com](https://render.com) → compte GitHub
2. **New** → **Blueprint** → repo `jojoskino/saas-facturation`
3. Render lit `render.yaml` (API + PostgreSQL)
4. Attendre le déploiement → copier l’URL (ex. `https://facturo-api.onrender.com`)
5. Mettre à jour Vercel :

```powershell
cd frontend
echo "https://VOTRE-URL.onrender.com" | vercel env add VITE_API_BASE_URL production --force
vercel --prod
```

6. Sur Render, variables déjà dans le blueprint :
   - `FRONTEND_URL=https://saas-facturation.vercel.app`
   - `CORS_ALLOWED_ORIGINS=https://saas-facturation.vercel.app`

---

## Option 2 — Railway (payant)

1. [railway.app](https://railway.app) → choisir un plan
2. Projet `facturo-api` → redeploy :

```powershell
cd backend
railway up
```

3. Vérifier : `https://facturo-api-production.up.railway.app/up`

---

## Développement local

Terminal 1 :
```powershell
cd backend
php artisan serve
```

Terminal 2 :
```powershell
cd frontend
npm run dev
```

Ouvrir http://localhost:5173 (pas la URL Vercel).

---

## Vérification rapide

```powershell
curl.exe https://VOTRE-API/up
```

Réponse HTML « Application up » = API OK.
