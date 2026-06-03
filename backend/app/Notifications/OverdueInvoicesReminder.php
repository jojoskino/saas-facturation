<?php

namespace App\Notifications;

use App\Support\BrandedMailMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;

class OverdueInvoicesReminder extends Notification
{
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
        $app = config('app.name', 'LAFACTURE');

        $rows = $this->invoices->map(function ($invoice): array {
            $client = $invoice->client?->name ?? 'Client';

            return [
                'number' => $invoice->number,
                'client' => $client,
                'amount' => number_format((float) $invoice->total, 2, ',', ' ').' '.($invoice->currency ?? 'XOF'),
                'due' => $invoice->due_date?->format('d/m/Y') ?? '—',
            ];
        })->all();

        return BrandedMailMessage::make()
            ->subject("{$app} — rappel factures en retard")
            ->markdown('mail.overdue-reminder', [
                'name' => $notifiable->name ?? null,
                'count' => $this->invoices->count(),
                'rows' => $rows,
                'actionUrl' => BrandedMailMessage::frontendUrl('app/factures'),
            ]);
    }
}
