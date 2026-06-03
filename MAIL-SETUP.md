# Configuration e-mail — LAFACTURE

Les notifications (mot de passe oublié, rappels factures en retard) partent via Laravel Mail.

## 1. Local (`backend/.env`)

```env
APP_NAME=LAFACTURE

MAIL_MAILER=smtp
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USERNAME=votre-login-brevo
MAIL_PASSWORD=votre-cle-smtp-brevo
MAIL_FROM_ADDRESS=contact@lafacture.app
MAIL_FROM_NAME="${APP_NAME}"
```

**Brevo** : [brevo.com](https://www.brevo.com) → Paramètres → SMTP & API → clé SMTP.  
Alternative : Resend, Mailgun, Gmail (mot de passe d’application).

Pour tester sans SMTP réel (dev uniquement) :

```env
MAIL_MAILER=log
```

Les messages apparaissent dans `backend/storage/logs/laravel.log`.

## 2. Test local

```powershell
cd backend
php artisan serve
```

1. Ouvrir http://localhost:5173/login  
2. « Mot de passe oublié » avec votre e-mail  
3. Vérifier la boîte mail (ou le log si `MAIL_MAILER=log`)

## 3. Production Fly.io

```powershell
cd backend
fly secrets set `
  APP_NAME=LAFACTURE `
  MAIL_MAILER=smtp `
  MAIL_HOST=smtp-relay.brevo.com `
  MAIL_PORT=587 `
  MAIL_USERNAME=VOTRE_LOGIN `
  MAIL_PASSWORD=VOTRE_CLE `
  MAIL_FROM_ADDRESS=contact@lafacture.app `
  MAIL_FROM_NAME=LAFACTURE `
  BILLING_ENTERPRISE_EMAIL=contact@lafacture.app `
  -a facturo-api

fly deploy
```

## 4. Vérification prod

- Mot de passe oublié sur https://saas-facturation.vercel.app  
- Expéditeur affiché : **LAFACTURE** &lt;contact@lafacture.app&gt;

## Notes

- Le domaine `@lafacture.app` doit être vérifié chez votre fournisseur SMTP (sinon les mails partent en spam ou échouent).
- Sur Fly, `QUEUE_CONNECTION=sync` : les e-mails partent immédiatement (pas de worker à lancer).
