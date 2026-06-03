<x-mail::message>
# Réinitialisation du mot de passe

Bonjour{{ $name ? ' '.$name : '' }},

Vous recevez cet e-mail car une réinitialisation de mot de passe a été demandée pour votre compte **{{ config('app.name') }}**.

<x-mail::button :url="$actionUrl">
Choisir un nouveau mot de passe
</x-mail::button>

<x-mail::panel>
Ce lien expire dans **60 minutes** et ne peut être utilisé **qu'une seule fois**. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.
</x-mail::panel>

<x-slot:subcopy>
Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur : [{{ $actionUrl }}]({{ $actionUrl }})
</x-slot:subcopy>
</x-mail::message>
