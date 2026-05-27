@extends('pdf.layout')

@section('content')
<table class="doc-header" style="border-collapse:collapse;">
    <tr>
        <td style="width:55%;">
            <span class="doc-type">{{ $isCreditNote ? 'Avoir' : 'Facture' }}</span>
            <p class="doc-brand">N° {{ $invoice->number }}</p>
            <p class="doc-meta"><strong>Émise le</strong> {{ $invoice->issue_date?->format('d/m/Y') ?? '—' }}</p>
            @if($invoice->due_date)
                <p class="doc-meta"><strong>Échéance</strong> {{ $invoice->due_date->format('d/m/Y') }}</p>
            @endif
            @if($invoice->quote)
                <p class="doc-meta"><strong>Réf. devis</strong> {{ $invoice->quote->number }}</p>
            @endif
            <p class="doc-meta" style="margin-top:8px;">
                <span class="doc-status">{{ strtoupper($invoice->status) }}</span>
            </p>
        </td>
        <td class="doc-issuer" style="width:45%;">
            @if(!empty($branding['logoSrc']))
                <img src="{{ $branding['logoSrc'] }}" alt="" class="doc-logo">
            @endif
            <div class="doc-issuer-name">{{ $issuer['name'] }}</div>
            @if($issuer['address'])<div>{{ $issuer['address'] }}</div>@endif
            @if($issuer['email'])<div>{{ $issuer['email'] }}</div>@endif
            @if($issuer['phone'])<div>{{ $issuer['phone'] }}</div>@endif
            @if($issuer['tax_id'])<div>N° fiscal : {{ $issuer['tax_id'] }}</div>@endif
        </td>
    </tr>
</table>

<table class="doc-parties">
    <tr>
        <td>
            <div class="doc-parties-label">Facturé à</div>
            <strong>{{ $client['name'] }}</strong><br>
            @if($client['address']){{ $client['address'] }}<br>@endif
            @if($client['email']){{ $client['email'] }}<br>@endif
            @if($client['phone']){{ $client['phone'] }}<br>@endif
            @if($client['tax_id'])N° fiscal : {{ $client['tax_id'] }}@endif
        </td>
        <td>
            <div class="doc-parties-label">Informations</div>
            Devise : <strong>{{ $invoice->currency }}</strong><br>
            @if(!$isCreditNote && $balance > 0)
                <strong style="color:#14213d;">Solde dû : {{ number_format($balance, 2, ',', ' ') }} {{ $invoice->currency }}</strong>
            @endif
        </td>
    </tr>
</table>

@if($items->isNotEmpty())
    @include('pdf.partials.lines', ['items' => $items, 'currency' => $invoice->currency])
@endif

<table class="doc-totals-wrap"><tr><td>
<table class="doc-totals">
    <tr class="sub"><td>Total HT</td><td>{{ number_format((float) $invoice->subtotal, 2, ',', ' ') }} {{ $invoice->currency }}</td></tr>
    <tr class="sub"><td>TVA</td><td>{{ number_format((float) $invoice->tax_amount, 2, ',', ' ') }} {{ $invoice->currency }}</td></tr>
    <tr class="total"><td>Total TTC</td><td>{{ number_format((float) $invoice->total, 2, ',', ' ') }} {{ $invoice->currency }}</td></tr>
    @if(!$isCreditNote)
        <tr class="highlight"><td>Déjà payé</td><td>{{ number_format($paidAmount, 2, ',', ' ') }} {{ $invoice->currency }}</td></tr>
        <tr class="highlight"><td>Solde restant</td><td>{{ number_format($balance, 2, ',', ' ') }} {{ $invoice->currency }}</td></tr>
    @endif
</table>
</td></tr></table>

@if($invoice->notes)
    <div class="doc-notes">
        <div class="doc-notes-title">Notes</div>
        {{ $invoice->notes }}
    </div>
@endif

@if($issuer['footer'] || $issuer['bank'])
    <div class="doc-footer">
        @if($issuer['bank'])<div><strong>Paiement :</strong> {{ $issuer['bank'] }}</div>@endif
        @if($issuer['footer'])<div style="margin-top:6px;">{{ $issuer['footer'] }}</div>@endif
        <div style="margin-top:8px;">Document généré par Facturo — {{ $isCreditNote ? 'Avoir' : 'Facture' }} {{ $invoice->number }}</div>
    </div>
@endif
@endsection
