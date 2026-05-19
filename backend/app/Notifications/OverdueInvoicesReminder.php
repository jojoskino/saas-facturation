<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;

class OverdueInvoicesReminder extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  Collection<int, \App\Models\Invoice>  $invoices
     */
    public function __construct(private readonly Collection $invoices) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $lines = $this->invoices->map(function ($invoice): string {
            $client = $invoice->client?->name ?? 'Client';

            return sprintf(
                '- %s (%s) : %s %s — échéance %s',
                $invoice->number,
                $client,
                number_format((float) $invoice->total, 2, ',', ' '),
                $invoice->currency,
                $invoice->due_date?->format('d/m/Y') ?? '—'
            );
        })->implode("\n");

        return (new MailMessage)
            ->subject('Facturo — rappel factures en retard')
            ->greeting('Bonjour '.$notifiable->name.',')
            ->line('Vous avez '.$this->invoices->count().' facture(s) en retard :')
            ->line($lines)
            ->action('Ouvrir Facturo', config('app.frontend_url', 'http://localhost:5173').'/app/factures')
            ->line('Pensez à relancer vos clients ou enregistrer un paiement partiel.');
    }
}
