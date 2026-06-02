<?php

namespace App\Support;

use Illuminate\Validation\Rule;

class PaymentMethods
{
    public const BANK_TRANSFER = 'bank_transfer';

    public const CASH = 'cash';

    public const MOBILE_MONEY = 'mobile_money';

    public const CHECK = 'check';

    public const CARD = 'card';

    public const OTHER = 'other';

    /** @var list<string> */
    public const ALL = [
        self::BANK_TRANSFER,
        self::CASH,
        self::MOBILE_MONEY,
        self::CHECK,
        self::CARD,
        self::OTHER,
    ];

    /** @return array<string, string> */
    public static function labels(): array
    {
        return [
            self::BANK_TRANSFER => 'Virement',
            self::CASH => 'Espèces',
            self::MOBILE_MONEY => 'Mobile money',
            self::CHECK => 'Chèque',
            self::CARD => 'Carte bancaire',
            self::OTHER => 'Autre',
        ];
    }

    public static function label(?string $method): ?string
    {
        if ($method === null || $method === '') {
            return null;
        }

        return self::labels()[$method] ?? $method;
    }

    /** @return list<string|Rule> */
    public static function validationRules(bool $required = true): array
    {
        $rules = ['string', Rule::in(self::ALL)];

        return $required ? array_merge(['required'], $rules) : array_merge(['nullable'], $rules);
    }
}
