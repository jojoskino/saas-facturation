@extends('pdf.layout')

@section('content')
<table class="doc-header" style="border-collapse:collapse;">
    <tr>
        <td style="width:55%;">
            <span class="doc-type">Devis</span>
            <p class="doc-brand">N° {{ $quote->number }}</p>
            <p class="doc-meta"><strong>Émis le</strong> {{ $quote->issue_date?->format('d/m/Y') ?? '—' }}</p>
            @if($quote->valid_until)
                <p class="doc-meta"><strong>Valable jusqu'au</strong> {{ $quote->valid_until->format('d/m/Y') }}</p>
            @endif
            <p class="doc-meta" style="margin-top:8px;">
                <span class="doc-status">{{ strtoupper($quote->status) }}</span>
            </p>
        </td>
        <td class="doc-issuer" style="width:45%;">
            @if(!empty($branding['logoPath']))
                <img src="{{ $branding['logoPath'] }}" alt="" class="doc-logo">
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
            <div class="doc-parties-label">Conditions</div>
            Devise : <strong>{{ $quote->currency }}</strong><br>
            @if((float) $quote->discount_percent > 0)
                Remise accordée : <strong>{{ $quote->discount_percent }} %</strong><br>
            @endif
            Document établi via Facturo.
        </td>
    </tr>
</table>

@include('pdf.partials.lines', ['items' => $quote->items, 'currency' => $quote->currency])

<table class="doc-totals-wrap"><tr><td>
<table class="doc-totals">
    <tr class="sub"><td>Total HT</td><td>{{ number_format((float) $quote->subtotal, 2, ',', ' ') }} {{ $quote->currency }}</td></tr>
    <tr class="sub"><td>TVA</td><td>{{ number_format((float) $quote->tax_amount, 2, ',', ' ') }} {{ $quote->currency }}</td></tr>
    <tr class="total"><td>Total TTC</td><td>{{ number_format((float) $quote->total, 2, ',', ' ') }} {{ $quote->currency }}</td></tr>
</table>
</td></tr></table>

@if($quote->notes)
    <div class="doc-notes">
        <div class="doc-notes-title">Notes</div>
        {{ $quote->notes }}
    </div>
@endif

@if($issuer['footer'] || $issuer['bank'])
    <div class="doc-footer">
        @if($issuer['bank'])<div><strong>Paiement :</strong> {{ $issuer['bank'] }}</div>@endif
        @if($issuer['footer'])<div style="margin-top:6px;">{{ $issuer['footer'] }}</div>@endif
    </div>
@endif
@endsection
