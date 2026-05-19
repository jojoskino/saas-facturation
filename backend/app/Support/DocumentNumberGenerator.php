<?php

namespace App\Support;

use App\Models\Invoice;
use App\Models\Quote;

class DocumentNumberGenerator
{
    public static function nextQuoteNumber(int $userId, ?int $ignoreQuoteId = null): string
    {
        return self::nextNumber('DEV', Quote::query()->where('user_id', $userId), 'number', $ignoreQuoteId);
    }

    public static function nextInvoiceNumber(int $userId, ?int $ignoreInvoiceId = null): string
    {
        return self::nextNumber('FAC', Invoice::query()->where('user_id', $userId), 'number', $ignoreInvoiceId);
    }

    public static function nextCreditNoteNumber(int $userId): string
    {
        return self::nextNumber('AVR', Invoice::query()->where('user_id', $userId), 'number');
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\Illuminate\Database\Eloquent\Model>  $query
     */
    private static function nextNumber(string $prefixCode, $query, string $column, ?int $ignoreId = null): string
    {
        $year = now()->year;
        $prefix = sprintf('%s-%d-', $prefixCode, $year);

        if ($ignoreId) {
            $query->where('id', '!=', $ignoreId);
        }

        $latest = (clone $query)
            ->where($column, 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value($column);

        $lastSequence = 0;
        if (is_string($latest)) {
            $lastPart = (string) str($latest)->afterLast('-');
            if (ctype_digit($lastPart)) {
                $lastSequence = (int) $lastPart;
            }
        }

        do {
            $lastSequence++;
            $candidate = sprintf('%s%04d', $prefix, $lastSequence);
            $exists = (clone $query)->where($column, $candidate)->exists();
        } while ($exists);

        return $candidate;
    }
}
