<x-mail::message>
# Factures en retard

Bonjour{{ $name ? ' '.$name : '' }},

Vous avez **{{ $count }}** facture(s) en retard sur {{ config('app.name') }} :

<x-mail::table>
| Facture | Client | Montant | Échéance |
|:--------|:-------|--------:|:---------|
@foreach ($rows as $row)
| {{ $row['number'] }} | {{ $row['client'] }} | {{ $row['amount'] }} | {{ $row['due'] }} |
@endforeach
</x-mail::table>

<x-mail::button :url="$actionUrl">
Voir mes factures
</x-mail::button>

Pensez à relancer vos clients ou à enregistrer un paiement depuis votre espace.

<x-slot:subcopy>
Accès direct : [{{ $actionUrl }}]({{ $actionUrl }})
</x-slot:subcopy>
</x-mail::message>
