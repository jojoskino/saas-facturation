<table class="doc-lines">
    <thead>
        <tr>
            <th>Description</th>
            <th class="num">Qté</th>
            <th class="num">PU HT</th>
            <th class="num">TVA</th>
            <th class="num">Total TTC</th>
        </tr>
    </thead>
    <tbody>
        @forelse($items as $item)
            <tr>
                <td>{{ $item->description }}</td>
                <td class="num">{{ $item->quantity }}</td>
                <td class="num">{{ number_format((float) $item->unit_price, 2, ',', ' ') }} {{ $currency }}</td>
                <td class="num">{{ number_format((float) $item->tax_rate, 2, ',', ' ') }} %</td>
                <td class="num">{{ number_format((float) $item->line_total, 2, ',', ' ') }} {{ $currency }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="5" style="text-align:center;color:#6b7280;">Aucune ligne de prestation</td>
            </tr>
        @endforelse
    </tbody>
</table>
