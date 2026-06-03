<?php

namespace App\Support;

class DocumentFormat
{
    /** Affiche une quantité sans décimales inutiles (1 au lieu de 1,0000). */
    public static function quantity(float|int|string|null $qty): string
    {
        $value = (float) ($qty ?? 0);

        if (abs($value - round($value)) < 0.000_01) {
            return (string) (int) round($value);
        }

        return rtrim(rtrim(number_format($value, 4, ',', ' '), '0'), ',');
    }
}
