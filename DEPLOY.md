# Déploiement Facturo (GitHub + Vercel)

Ce dépôt contient **deux parties** :

| Dossier      | Rôle              | Hébergement recommandé        |
| ------------ | ----------------- | ----------------------------- |
| `frontend/`  | React (Vite)      | **Vercel**                    |
| `backend/`   | API Laravel       | Render, Railway, Fly.io, etc. |

Vercel sert le site React. L’API PHP Laravel doit tourner ailleurs (Vercel n’héberge pas Laravel de façon native).

---

## 1. Pousser sur GitHub

```bash
git add .
git commit -m "Préparation déploiement Vercel et fonctionnalités récentes"
git push origin main
```

Dépôt : `https://github.com/jojoskino/saas-facturation`

---

## 2. Déployer le frontend sur Vercel

1. Aller sur [vercel.com](https://vercel.com) → **Add New Project**
2. Importer le repo GitHub `jojoskino/saas-facturation`
3. Réglages du projet :
   - **Root Directory** : `frontend`
   - **Framework Preset** : Vite (détecté automatiquement)
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
4. **Environment Variables** (Production) :

   | Nom                   | Valeur                                      |
   | --------------------- | ------------------------------------------- |
   | `VITE_API_BASE_URL`   | URL publique de votre API Laravel (HTTPS)   |

   Exemple : `https://saas-facturo-api.onrender.com` (sans slash final).

5. Cliquer **Deploy**

Le fichier `frontend/vercel.json` redirige toutes les routes vers `index.html` (React Router).

---

## 3. Héberger l’API Laravel (obligatoire)

Sans backend en ligne, le frontend Vercel affichera l’interface mais les connexions/API échoueront.

### Exemple minimal (Render)

1. Créer un **Web Service** pointant vers le dossier `backend`
2. Build : `composer install --no-dev --optimize-autoloader`
3. Start : `php artisan serve` ou document root `public/` selon l’hébergeur
4. Variables d’environnement (extrait de `backend/.env.example`) :
   - `APP_KEY`, `APP_URL` (URL du service API)
   - `FRONTEND_URL` = URL Vercel (ex. `https://saas-facturation.vercel.app`)
   - `CORS_ALLOWED_ORIGINS` = même URL Vercel (+ preview si besoin)
   - Base de données (PostgreSQL/MySQL en prod, pas SQLite)
   - `php artisan migrate --force` au déploiement
   - `php artisan storage:link` si logos/fichiers

### CORS

Dans le `.env` du backend en production :

```env
FRONTEND_URL=https://votre-projet.vercel.app
CORS_ALLOWED_ORIGINS=https://votre-projet.vercel.app
```

Ajoutez les URLs de preview Vercel si vous testez des branches :

```env
CORS_ALLOWED_ORIGINS=https://votre-projet.vercel.app,https://votre-projet-xxx.vercel.app
```

---

## 4. Vérification après déploiement

- [ ] Page d’accueil Vercel s’affiche
- [ ] `/login` et `/register` sans erreur 404 (rewrite SPA)
- [ ] Connexion : requêtes vers `VITE_API_BASE_URL` (onglet Réseau du navigateur)
- [ ] Pas d’erreur CORS (origine Vercel autorisée côté Laravel)

---

## 5. Domaine personnalisé (optionnel)

- **Vercel** : Settings → Domains → ajouter `app.votredomaine.com`
- Mettre à jour `FRONTEND_URL` et `CORS_ALLOWED_ORIGINS` sur le backend

---

## Dépannage

| Problème              | Cause probable                    | Action                                      |
| --------------------- | --------------------------------- | ------------------------------------------- |
| 404 sur `/app/...`    | Rewrite SPA manquant              | Vérifier `frontend/vercel.json`             |
| API vers localhost    | Variable Vercel non définie       | Définir `VITE_API_BASE_URL` puis **Redeploy** |
| Erreur CORS           | Origine non autorisée             | Mettre à jour `CORS_ALLOWED_ORIGINS`        |
| 502 / timeout API     | Backend arrêté ou mauvaise URL    | Vérifier l’hébergeur Laravel                |
