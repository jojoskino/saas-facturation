@extends('pdf.layout')

@section('content')
<table class="doc-top">
    <tr>
        <td style="width:55%;">
            <div class="doc-issuer-name">{{ $issuer['name'] }}</div>
            <div class="doc-issuer-meta">Historique du document</div>
        </td>
        <td class="doc-meta-box" style="width:45%;">
            <span class="doc-type">{{ $documentType }}</span>
            <p class="doc-number">{{ $documentNumber }}</p>
            <p class="doc-meta-line"><strong>Client</strong> {{ $clientName }}</p>
            <p class="doc-meta-line"><strong>Généré le</strong> {{ now()->format('d/m/Y H:i') }}</p>
        </td>
    </tr>
</table>

<div class="doc-rule"></div>

<table class="doc-lines doc-history">
    <thead>
        <tr>
            <th style="width:22%;">Date</th>
            <th style="width:28%;">Événement</th>
            <th>Détail</th>
        </tr>
    </thead>
    <tbody>
        @forelse($events as $event)
            <tr>
                <td>{{ $event['date_label'] }}</td>
                <td><strong>{{ $event['title'] }}</strong></td>
                <td>{{ $event['detail'] }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="3" style="text-align:center;color:#64748b;">Aucun événement enregistré.</td>
            </tr>
        @endforelse
    </tbody>
</table>

<div class="doc-footer">
    Document généré par LAFACTURE — historique {{ $documentNumber }}
</div>
@endsection
