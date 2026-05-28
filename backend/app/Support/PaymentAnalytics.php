<?php

namespace App\Support;

use App\Models\Invoice;
use App\Models\Payment;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class PaymentAnalytics
{
    public static function paymentsBaseQuery(int $userId): Builder
    {
        return Payment::query()
            ->join('invoices', 'payments.invoice_id', '=', 'invoices.id')
            ->where('invoices.user_id', $userId)
            ->where('invoices.document_type', 'invoice')
            ->where('invoices.status', '!=', 'cancelled');
    }

    public static function revenueBetween(int $userId, CarbonImmutable $start, CarbonImmutable $end): float
    {
        return (float) self::paymentsBaseQuery($userId)
            ->whereBetween('payments.paid_at', [$start, $end])
            ->sum('payments.amount');
    }

    public static function totalRevenue(int $userId): float
    {
        return (float) self::paymentsBaseQuery($userId)->sum('payments.amount');
    }

    public static function outstandingBalance(int $userId): float
    {
        $row = Invoice::query()
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->whereIn('status', ['sent', 'overdue'])
            ->leftJoinSub(
                Payment::query()
                    ->select('invoice_id', DB::raw('coalesce(sum(amount), 0) as paid_total'))
                    ->groupBy('invoice_id'),
                'payment_totals',
                'payment_totals.invoice_id',
                '=',
                'invoices.id'
            )
            ->selectRaw('coalesce(sum(greatest(invoices.total - coalesce(payment_totals.paid_total, 0), 0)), 0) as outstanding')
            ->first();

        return (float) ($row->outstanding ?? 0);
    }

    /**
     * @return array<string, float>
     */
    public static function monthlyRevenue(int $userId, CarbonImmutable $rangeStart, CarbonImmutable $rangeEnd): array
    {
        return self::paymentsBaseQuery($userId)
            ->selectRaw("to_char(date_trunc('month', payments.paid_at), 'YYYY-MM') as ym, sum(payments.amount) as total")
            ->whereBetween('payments.paid_at', [$rangeStart, $rangeEnd])
            ->groupBy('ym')
            ->orderBy('ym')
            ->pluck('total', 'ym')
            ->map(fn ($value) => (float) $value)
            ->all();
    }

    public static function averagePaymentBetween(int $userId, CarbonImmutable $start, CarbonImmutable $end): float
    {
        return (float) self::paymentsBaseQuery($userId)
            ->whereBetween('payments.paid_at', [$start, $end])
            ->avg('payments.amount');
    }

    /**
     * @return list<array{client_id: int|null, revenue_cfa: float, invoices_count: int}>
     */
    public static function topClientsByPayments(int $userId, CarbonImmutable $start, CarbonImmutable $end, int $limit = 10): array
    {
        return self::paymentsBaseQuery($userId)
            ->whereBetween('payments.paid_at', [$start, $end])
            ->whereNotNull('invoices.client_id')
            ->select('invoices.client_id', DB::raw('sum(payments.amount) as revenue'), DB::raw('count(distinct invoices.id) as invoices_count'))
            ->groupBy('invoices.client_id')
            ->orderByDesc('revenue')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'client_id' => (int) $row->client_id,
                'revenue_cfa' => (float) $row->revenue,
                'invoices_count' => (int) $row->invoices_count,
            ])
            ->all();
    }
}
