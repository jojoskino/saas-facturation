<table class="doc-lines">
    <thead>
        <tr>
            <th>Description</th>
            <th class="doc-col-num">Qté</th>
            <th class="doc-col-num">
                PU HT
                <span class="doc-th-unit">{{ $currency }}</span>
            </th>
            <th class="doc-col-num">
                TVA
                <span class="doc-th-unit">%</span>
            </th>
            <th class="doc-col-num">
                Total TTC
                <span class="doc-th-unit">{{ $currency }}</span>
            </th>
        </tr>
    </thead>
    <tbody>
        @forelse($items as $item)
            <tr>
                <td>{{ $item->description }}</td>
                <td class="doc-col-num">{{ \App\Support\DocumentFormat::quantity($item->quantity) }}</td>
                <td class="doc-col-num">{{ number_format((float) $item->unit_price, 2, ',', ' ') }}</td>
                <td class="doc-col-num">{{ number_format((float) $item->tax_rate, 2, ',', ' ') }}</td>
                <td class="doc-col-num">{{ number_format((float) $item->line_total, 2, ',', ' ') }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="5" style="text-align:center;color:#6b7280;">Aucune ligne de prestation</td>
            </tr>
        @endforelse
    </tbody>
</table>
