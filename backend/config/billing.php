<?php

return [

    'mode' => env('BILLING_MODE', 'auto'),

    'currency' => env('BILLING_CURRENCY', 'xof'),

    'stripe' => [
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'price_pro' => env('STRIPE_PRICE_PRO'),
    ],

    'plans' => [
        'free' => [
            'label' => 'Gratuit',
            'price_label' => '0 F CFA / mois',
            'price_cents' => 0,
            'self_serve' => false,
        ],
        'pro' => [
            'label' => 'Pro',
            'price_label' => '5 000 F CFA / mois',
            'price_cents' => 5000,
            'self_serve' => true,
            'stripe_price' => env('STRIPE_PRICE_PRO'),
        ],
        'enterprise' => [
            'label' => 'Entreprise',
            'price_label' => 'Sur devis',
            'price_cents' => null,
            'self_serve' => false,
            'contact_email' => env('BILLING_ENTERPRISE_EMAIL', 'contact@facturo.app'),
        ],
    ],

];
