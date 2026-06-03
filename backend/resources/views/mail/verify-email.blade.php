<x-mail::message>
# Confirmez votre adresse e-mail

Bonjour{{ $name ? ' '.$name : '' }},

Merci de vous être inscrit sur **{{ config('app.name') }}**. Une dernière étape : confirmez votre adresse e-mail pour accéder à votre espace.

<x-mail::button :url="$actionUrl">
Confirmer mon e-mail
</x-mail::button>

<x-mail::panel>
Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer ce message en toute sécurité.
</x-mail::panel>

<x-slot:subcopy>
Lien de secours : [{{ $actionUrl }}]({{ $actionUrl }})
</x-slot:subcopy>
</x-mail::message>
