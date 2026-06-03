<?php

namespace App\Notifications;

use App\Support\BrandedMailMessage;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends VerifyEmail
{
    protected function verificationUrl($notifiable): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );
    }

    public function toMail($notifiable): MailMessage
    {
        $app = config('app.name', 'LAFACTURE');

        return BrandedMailMessage::make()
            ->subject("Confirmez votre adresse e-mail — {$app}")
            ->markdown('mail.verify-email', [
                'name' => $notifiable->name ?? null,
                'actionUrl' => $this->verificationUrl($notifiable),
            ]);
    }
}
