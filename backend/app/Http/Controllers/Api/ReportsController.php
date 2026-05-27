<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Quote;
use App\Support\PlanFeatures;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

class ReportsController extends Controller
{
    #[OA\Get(
        path: '/api/reports/summary',
        tags: ['Rapports'],
        summary: 'Synthèse analytique par période',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'period', in: 'query', schema: new OA\Schema(type: 'string', enum: ['month', 'quarter', 'year'])),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Indicateurs et séries'),
        ]
    )]
    public function summary(Request $request): JsonResponse
    {
        $period = $this->normalizePeriod((string) $request->query('period', 'year'));
        $userId = (int) $request->user()->id;
        [$start, $end] = $this->periodRange($period);
        [$prevStart, $prevEnd] = $this->previousPeriodRange($period);

        $revenuePaid = (float) Invoice::query()
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $end])
            ->sum('total');

        $revenuePaidPrevious = (float) Invoice::query()
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$prevStart, $prevEnd])
            ->sum('total');

        $outstanding = (float) Invoice::query()
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->whereIn('status', ['sent', 'overdue'])
            ->sum('total');

        $invoicesIssued = (int) Invoice::query()
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->whereBetween('issue_date', [$start->toDateString(), $end->toDateString()])
            ->count();

        $invoicesPaid = (int) Invoice::query()
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $end])
            ->count();

        $overdueCount = (int) Invoice::query()
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->where('status', 'overdue')
            ->count();

        $quotesCreated = (int) Quote::query()
            ->where('user_id', $userId)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $quotesAccepted = (int) Quote::query()
            ->where('user_id', $userId)
            ->where('status', 'accepted')
            ->whereBetween('updated_at', [$start, $end])
            ->count();

        $conversionRate = $quotesCreated > 0
            ? round(($quotesAccepted / $quotesCreated) * 100, 1)
            : 0.0;

        $avgPaid = (float) Invoice::query()
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $end])
            ->avg('total');

        $invoicesByStatus = Invoice::query()
            ->select('status', DB::raw('count(*) as count'))
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->whereBetween('issue_date', [$start->toDateString(), $end->toDateString()])
            ->groupBy('status')
            ->pluck('count', 'status')
            ->all();

        $quotesByStatus = Quote::query()
            ->select('status', DB::raw('count(*) as count'))
            ->where('user_id', $userId)
            ->whereBetween('created_at', [$start, $end])
            ->groupBy('status')
            ->pluck('count', 'status')
            ->all();

        $topClients = Invoice::query()
            ->select('client_id', DB::raw('sum(total) as revenue'), DB::raw('count(*) as invoices_count'))
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $end])
            ->whereNotNull('client_id')
            ->groupBy('client_id')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                $client = Client::query()->find($row->client_id);

                return [
                    'client_id' => $row->client_id,
                    'name' => $client?->company ?: ($client?->name ?: trim(($client?->first_name ?? '').' '.($client?->last_name ?? '')) ?: '—'),
                    'revenue_cfa' => (float) $row->revenue,
                    'invoices_count' => (int) $row->invoices_count,
                ];
            })
            ->values()
            ->all();

        $overdueInvoices = Invoice::query()
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->where('status', 'overdue')
            ->with('client:id,first_name,last_name,company')
            ->orderBy('due_date')
            ->limit(15)
            ->get(['id', 'number', 'client_id', 'total', 'currency', 'due_date'])
            ->map(fn (Invoice $inv) => [
                'id' => $inv->id,
                'number' => $inv->number,
                'client_name' => $inv->client?->company ?: ($inv->client?->name ?: trim(($inv->client?->first_name ?? '').' '.($inv->client?->last_name ?? '')) ?: '—'),
                'total' => (float) $inv->total,
                'currency' => $inv->currency,
                'due_date' => $inv->due_date,
                'days_overdue' => $inv->due_date
                    ? max(0, CarbonImmutable::today()->diffInDays(CarbonImmutable::parse($inv->due_date)))
                    : 0,
            ])
            ->all();

        $aging = $this->overdueAging($userId);

        return response()->json([
            'period' => $period,
            'period_label' => $this->periodLabel($period, $start, $end),
            'revenue_paid_cfa' => $revenuePaid,
            'revenue_paid_trend_pct' => $this->pctChange($revenuePaid, $revenuePaidPrevious),
            'outstanding_cfa' => $outstanding,
            'invoices_issued' => $invoicesIssued,
            'invoices_paid' => $invoicesPaid,
            'overdue_count' => $overdueCount,
            'quotes_created' => $quotesCreated,
            'quotes_accepted' => $quotesAccepted,
            'conversion_rate_pct' => $conversionRate,
            'avg_invoice_cfa' => round($avgPaid, 0),
            'invoices_by_status' => $invoicesByStatus,
            'quotes_by_status' => $quotesByStatus,
            'monthly_revenue_cfa' => $this->monthlyRevenueSeries($userId, $period, $start, $end),
            'top_clients' => $topClients,
            'overdue_invoices' => $overdueInvoices,
            'overdue_aging' => $aging,
            'plan_features' => PlanFeatures::forUser($request->user()),
        ]);
    }

  /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function periodRange(string $period): array
    {
        $now = CarbonImmutable::now();

        return match ($period) {
            'month' => [$now->startOfMonth(), $now],
            'quarter' => [$now->firstOfQuarter(), $now],
            default => [$now->startOfYear(), $now],
        };
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function previousPeriodRange(string $period): array
    {
        $now = CarbonImmutable::now();

        return match ($period) {
            'month' => [
                $now->subMonth()->startOfMonth(),
                $now->subMonth()->endOfMonth(),
            ],
            'quarter' => [
                $now->subQuarter()->firstOfQuarter(),
                $now->subQuarter()->endOfQuarter(),
            ],
            default => [
                $now->subYear()->startOfYear(),
                $now->subYear()->endOfYear(),
            ],
        };
    }

    private function normalizePeriod(string $period): string
    {
        return in_array($period, ['month', 'quarter', 'year'], true) ? $period : 'year';
    }

    private function periodLabel(string $period, CarbonImmutable $start, CarbonImmutable $end): string
    {
        return match ($period) {
            'month' => $start->locale('fr')->translatedFormat('F Y'),
            'quarter' => 'T'.$start->quarter.' '.$start->format('Y'),
            default => $start->format('Y'),
        };
    }

    /**
     * @return list<array{month: string, label: string, total: float}>
     */
    private function monthlyRevenueSeries(int $userId, string $period, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $bucketCount = match ($period) {
            'month' => 1,
            'quarter' => 3,
            default => 12,
        };

        $rangeStart = match ($period) {
            'month' => $start,
            'quarter' => $start,
            default => $end->startOfMonth()->subMonths(11),
        };

        $monthlyPaidRows = Invoice::query()
            ->selectRaw("to_char(date_trunc('month', paid_at), 'YYYY-MM') as ym, sum(total) as total")
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$rangeStart, $end])
            ->groupBy('ym')
            ->orderBy('ym')
            ->get()
            ->pluck('total', 'ym');

        $series = [];
        for ($i = $bucketCount - 1; $i >= 0; $i--) {
            $month = $end->startOfMonth()->subMonths($i);
            $key = $month->format('Y-m');
            $series[] = [
                'month' => $key,
                'label' => $month->locale('fr')->translatedFormat('M'),
                'total' => (float) ($monthlyPaidRows[$key] ?? 0),
            ];
        }

        return $series;
    }

    /**
     * @return array<string, int>
     */
    private function overdueAging(int $userId): array
    {
        $today = CarbonImmutable::today();
        $buckets = ['0_30' => 0, '31_60' => 0, '61_plus' => 0];

        $overdue = Invoice::query()
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->where('status', 'overdue')
            ->whereNotNull('due_date')
            ->get(['due_date']);

        foreach ($overdue as $invoice) {
            $days = CarbonImmutable::parse($invoice->due_date)->diffInDays($today, false);
            if ($days <= 30) {
                $buckets['0_30']++;
            } elseif ($days <= 60) {
                $buckets['31_60']++;
            } else {
                $buckets['61_plus']++;
            }
        }

        return $buckets;
    }

    private function pctChange(float|int $current, float|int $previous): float
    {
        $previousValue = (float) $previous;
        $currentValue = (float) $current;
        if ($previousValue <= 0.0) {
            return $currentValue > 0.0 ? 100.0 : 0.0;
        }

        return round((($currentValue - $previousValue) / $previousValue) * 100, 1);
    }
}
