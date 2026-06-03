@extends('pdf.layout')

@section('content')
<table class="doc-top">
    <tr>
        <td style="width:52%;">
            @if(!empty($branding['logoSrc']))
                <img src="{{ $branding['logoSrc'] }}" alt="" class="doc-logo">
            @endif
            <div class="doc-issuer-name">{{ $issuer['name'] }}</div>
            <div class="doc-issuer-meta">
                @if($issuer['address']){{ $issuer['address'] }}<br>@endif
                @if($issuer['email']){{ $issuer['email'] }}@if($issuer['phone']) · @endif @endif
                @if($issuer['phone']){{ $issuer['phone'] }}@endif
                @if($issuer['tax_id'])<br>N° fiscal : {{ $issuer['tax_id'] }}@endif
            </div>
        </td>
        <td class="doc-meta-box" style="width:48%;">
            <span class="doc-type">{{ $isCreditNote ? 'Avoir' : 'Facture' }}</span>
            <p class="doc-number">{{ $invoice->number }}</p>
            <p class="doc-meta-line"><strong>Émise le</strong> {{ $invoice->issue_date?->format('d/m/Y') ?? '—' }}</p>
            @if($invoice->due_date)
                <p class="doc-meta-line"><strong>Échéance</strong> {{ $invoice->due_date->format('d/m/Y') }}</p>
            @endif
            @if($invoice->quote)
                <p class="doc-meta-line"><strong>Réf. devis</strong> {{ $invoice->quote->number }}</p>
            @endif
        </td>
    </tr>
</table>

<div class="doc-rule"></div>

<table class="doc-parties">
    <tr>
        <td>
            <div class="doc-parties-label">Facturé à</div>
            <div class="doc-parties-name">{{ $client['name'] }}</div>
            <div class="doc-parties-body">
                @if($client['address']){{ $client['address'] }}<br>@endif
                @if($client['email']){{ $client['email'] }}<br>@endif
                @if($client['phone']){{ $client['phone'] }}<br>@endif
                @if($client['tax_id'])N° fiscal : {{ $client['tax_id'] }}@endif
            </div>
        </td>
        <td>
            <div class="doc-parties-label">Informations</div>
            <div class="doc-parties-body">
                Devise : <strong>{{ $invoice->currency }}</strong><br>
                @if(!$isCreditNote && $balance > 0)
                    Solde dû : <strong>{{ number_format($balance, 2, ',', ' ') }} {{ $invoice->currency }}</strong>
                @endif
            </div>
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
        @if($issuer['footer'])<div style="margin-top:4px;">{{ $issuer['footer'] }}</div>@endif
        <div style="margin-top:6px;">Document généré par LAFACTURE</div>
    </div>
@endif
@endsection
