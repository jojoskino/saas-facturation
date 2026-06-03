<?php

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Notifications\ResetPasswordNotification;
use App\Models\User;

$to = config('mail.from.address') ?: config('mail.mailers.smtp.username');
$user = User::query()->where('email', $to)->first() ?? new User([
    'name' => 'Test',
    'email' => $to,
]);

$notification = new ResetPasswordNotification(
    rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/').'/reset-password?token=demo&email='.urlencode($to)
);

$user->notify($notification);

echo "OK — e-mail de démo envoyé à {$to}\n";
