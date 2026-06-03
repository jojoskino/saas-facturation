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
            <span class="doc-type">Devis</span>
            <p class="doc-number">{{ $quote->number }}</p>
            <p class="doc-meta-line"><strong>Émis le</strong> {{ $quote->issue_date?->format('d/m/Y') ?? '—' }}</p>
            @if($quote->valid_until)
                <p class="doc-meta-line"><strong>Valable jusqu'au</strong> {{ $quote->valid_until->format('d/m/Y') }}</p>
            @endif
        </td>
    </tr>
</table>

<div class="doc-rule"></div>

<table class="doc-parties">
    <tr>
        <td>
            <div class="doc-parties-label">Destinataire</div>
            <div class="doc-parties-name">{{ $client['name'] }}</div>
            <div class="doc-parties-body">
                @if($client['address']){{ $client['address'] }}<br>@endif
                @if($client['email']){{ $client['email'] }}<br>@endif
                @if($client['phone']){{ $client['phone'] }}<br>@endif
                @if($client['tax_id'])N° fiscal : {{ $client['tax_id'] }}@endif
            </div>
        </td>
        <td>
            <div class="doc-parties-label">Conditions</div>
            <div class="doc-parties-body">
                Devise : <strong>{{ $quote->currency }}</strong><br>
                @if((float) $quote->discount_percent > 0)
                    Remise accordée : <strong>{{ $quote->discount_percent }} %</strong><br>
                @endif
                Ce devis est valable selon les dates indiquées ci-dessus.
            </div>
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
        @if($issuer['footer'])<div style="margin-top:4px;">{{ $issuer['footer'] }}</div>@endif
        <div style="margin-top:6px;">Document généré par LAFACTURE</div>
    </div>
@endif
@endsection
