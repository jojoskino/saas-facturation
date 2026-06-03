<?php

namespace App\Support;

use Illuminate\Notifications\Messages\MailMessage;

class BrandedMailMessage
{
    public static function make(): MailMessage
    {
        return (new MailMessage)
            ->salutation('Cordialement, l\'équipe '.config('app.name', 'LAFACTURE'));
    }

    public static function frontendUrl(string $path = ''): string
    {
        $base = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');
        $path = ltrim($path, '/');

        return $path === '' ? $base : $base.'/'.$path;
    }
}
