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

## 2. Déployer le frontend sur Vercel (CLI)

### Prérequis

- Node.js installé
- Compte [Vercel](https://vercel.com) lié à GitHub

### Installation CLI

```powershell
npm install -g vercel
vercel login
```

(Ouvre le navigateur pour s’authentifier.)

### Lier le projet (depuis la racine du repo)

```powershell
cd "c:\Mes projets\saas-facturation\frontend"
vercel link
```

Réponses typiques à l’assistant :

- **Set up and deploy?** → Yes (ou lier un projet existant)
- **Which scope?** → votre compte / équipe
- **Link to existing project?** → No (première fois) ou Yes si déjà créé
- **Project name?** → `saas-facturation` (ou autre)
- **In which directory is your code located?** → `./` (vous êtes déjà dans `frontend`)

Alternative depuis la racine sans `cd` :

```powershell
cd "c:\Mes projets\saas-facturation"
vercel link --cwd frontend
```

### Variable d’environnement (API Laravel)

Remplacez l’URL par celle de votre backend en production (HTTPS, **sans** slash final) :

```powershell
cd frontend
vercel env add VITE_API_BASE_URL production
# Coller : https://votre-api.onrender.com
```

Vérifier les variables :

```powershell
vercel env ls
```

### Build local (test avant prod)

```powershell
cd frontend
npm ci
npm run build
```

### Déploiement production

```powershell
cd frontend
vercel --prod
```

À la fin, la CLI affiche l’URL (ex. `https://saas-facturation.vercel.app`).

### Déploiements suivants (après `git push`)

```powershell
cd frontend
vercel --prod
```

Ou connecter Git pour déployer à chaque push :

```powershell
vercel git connect
```

### Commandes utiles

```powershell
vercel ls                    # liste des déploiements
vercel inspect <url>         # détails d’un déploiement
vercel env pull .env.local   # récupérer les vars (preview/dev)
vercel logs <deployment-url> # logs
```

Le fichier `frontend/vercel.json` redirige toutes les routes vers `index.html` (React Router).

### Interface web (optionnel)

Même réglages que la CLI : **Root Directory** = `frontend`, **Output** = `dist`, variable `VITE_API_BASE_URL`.

---

## 3. Héberger l’API Laravel (obligatoire)

Sans backend en ligne, le frontend Vercel affichera l’interface mais les connexions/API échoueront.

### Exemple minimal (Render — CLI)

```powershell
# Installer Render CLI : https://render.com/docs/cli
# winget install Render.RenderCLI   (ou scoop / téléchargement manuel)

render login
```

Créer un `render.yaml` à la racine ou via le dashboard, puis :

```powershell
render services create
# Choisir Web Service, repo GitHub, root directory : backend
```

Variables à définir (CLI ou dashboard) :

### Variables backend (Render / Railway / autre)

1. Créer un **Web Service** pointant vers le dossier `backend`
2. Build : `composer install --no-dev --optimize-autoloader`
3. Start : document root `public/` (Apache/Nginx) ou `php artisan serve` selon l’hébergeur
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

```powershell
vercel domains add app.votredomaine.com
```

Mettre à jour `FRONTEND_URL` et `CORS_ALLOWED_ORIGINS` sur le backend.

---

## Dépannage

| Problème              | Cause probable                    | Action                                      |
| --------------------- | --------------------------------- | ------------------------------------------- |
| 404 sur `/app/...`    | Rewrite SPA manquant              | Vérifier `frontend/vercel.json`             |
| API vers localhost    | Variable Vercel non définie       | Définir `VITE_API_BASE_URL` puis **Redeploy** |
| Erreur CORS           | Origine non autorisée             | Mettre à jour `CORS_ALLOWED_ORIGINS`        |
| 502 / timeout API     | Backend arrêté ou mauvaise URL    | Vérifier l’hébergeur Laravel                |
