<?php

namespace App\Support;

class DocumentMath
{
    /**
     * @param  array<int, array{quantity: float|int|string, unit_price: float|int|string, tax_rate?: float|int|string}>  $rows
     * @return array{lines: list<array{description: string, quantity: string, unit_price: string, tax_rate: string, line_total: string, sort_order: int}>, subtotal: string, tax_amount: string, total: string}
     */
    public static function quoteLinesFromInput(array $rows): array
    {
        $lines = [];
        $subtotal = 0.0;
        $taxAmount = 0.0;
        foreach ($rows as $index => $row) {
            $qty = (float) $row['quantity'];
            $unit = (float) $row['unit_price'];
            $rate = isset($row['tax_rate']) ? (float) $row['tax_rate'] : 0.0;
            $lineSub = round($qty * $unit, 2);
            $lineTax = round($lineSub * ($rate / 100), 2);
            $lineTotal = round($lineSub + $lineTax, 2);
            $subtotal += $lineSub;
            $taxAmount += $lineTax;
            $lines[] = [
                'description' => $row['description'],
                'quantity' => number_format($qty, 4, '.', ''),
                'unit_price' => number_format($unit, 2, '.', ''),
                'tax_rate' => number_format($rate, 2, '.', ''),
                'line_total' => number_format($lineTotal, 2, '.', ''),
                'sort_order' => $index,
            ];
        }

        $subtotal = round($subtotal, 2);
        $taxAmount = round($taxAmount, 2);
        $total = round($subtotal + $taxAmount, 2);

        return [
            'lines' => $lines,
            'subtotal' => number_format($subtotal, 2, '.', ''),
            'tax_amount' => number_format($taxAmount, 2, '.', ''),
            'total' => number_format($total, 2, '.', ''),
        ];
    }
}
