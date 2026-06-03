<?php

namespace App\Notifications;

use App\Support\BrandedMailMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    public function __construct(private readonly string $resetUrl) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $app = config('app.name', 'LAFACTURE');

        return BrandedMailMessage::make()
            ->subject("Réinitialisation de votre mot de passe — {$app}")
            ->markdown('mail.reset-password', [
                'name' => $notifiable->name ?? null,
                'actionUrl' => $this->resetUrl,
            ]);
    }
}
