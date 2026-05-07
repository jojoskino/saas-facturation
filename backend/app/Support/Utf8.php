<?php

namespace App\Support;

final class Utf8
{
    /**
     * Supprime ou remplace les séquences UTF-8 invalides (évite JsonEncodingException).
     */
    public static function clean(?string $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        if (function_exists('mb_scrub')) {
            return mb_scrub($value, 'UTF-8');
        }

        $converted = @iconv('UTF-8', 'UTF-8//IGNORE', $value);

        return $converted !== false ? $converted : '';
    }
}
