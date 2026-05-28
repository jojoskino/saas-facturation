<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\Quote;
use App\Models\User;
use App\Notifications\OverdueInvoicesReminder;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

class UpdateDocumentStatuses extends Command
{
    protected $signature = 'documents:update-statuses {--remind : Envoyer les relances e-mail}';

    protected $description = 'Marque les devis expirés et factures en retard, envoie les relances hebdomadaires';

    public function handle(): int
    {
        $today = Carbon::today()->toDateString();

        $expiredQuotes = Quote::query()
            ->whereNotIn('status', ['accepted', 'rejected', 'expired'])
            ->whereNotNull('valid_until')
            ->whereDate('valid_until', '<', $today)
            ->update(['status' => 'expired']);

        $overdueInvoices = Invoice::query()
            ->where('document_type', 'invoice')
            ->where('status', 'sent')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', $today)
            ->update(['status' => 'overdue']);

        $this->info("Devis expirés : {$expiredQuotes}, factures en retard : {$overdueInvoices}");

        if ($this->option('remind')) {
            $this->sendReminders();
        }

        return self::SUCCESS;
    }

    private function sendReminders(): void
    {
        $users = User::query()
            ->where('notifications_email', true)
            ->get();

        foreach ($users as $user) {
            $overdue = Invoice::query()
                ->where('user_id', $user->id)
                ->where('document_type', 'invoice')
                ->where('status', 'overdue')
                ->with('client:id,name')
                ->get();

            if ($overdue->isEmpty()) {
                continue;
            }

            Notification::send($user, new OverdueInvoicesReminder($overdue));
            $this->line("Relance envoyée à {$user->email} ({$overdue->count()} facture(s)).");
        }
    }
}
