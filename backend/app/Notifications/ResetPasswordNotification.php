<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly string $resetUrl) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Réinitialisation de votre mot de passe — Facturo')
            ->line('Vous recevez cet e-mail car une réinitialisation de mot de passe a été demandée.')
            ->action('Choisir un nouveau mot de passe', $this->resetUrl)
            ->line('Ce lien expire dans 60 minutes.')
            ->line('Si vous n\'êtes pas à l\'origine de cette demande, ignorez ce message.');
    }
}
