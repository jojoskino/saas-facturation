<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Quote;
use App\Models\User;
use App\Support\PlanFeatures;
use App\Support\PaymentAnalytics;
use App\Support\UserAnalyticsCache;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardController extends Controller
{
    private const SUMMARY_TTL_SECONDS = 60;

    #[OA\Get(
        path: '/api/dashboard/summary',
        tags: ['Dashboard'],
        summary: 'Synthèse tableau de bord',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Compteurs et montants (CFA)'),
        ]
    )]
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = (int) $user->id;

        $payload = Cache::remember(
            UserAnalyticsCache::dashboardKey($userId),
            self::SUMMARY_TTL_SECONDS,
            fn (): array => $this->buildSummary($userId, $user)
        );

        return response()->json($payload);
    }

    public function home(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = (int) $user->id;

        $payload = Cache::remember(
            UserAnalyticsCache::dashboardHomeKey($userId),
            self::SUMMARY_TTL_SECONDS,
            fn (): array => [
                'summary' => $this->buildSummary($userId, $user),
                'recent_quotes' => Quote::query()
                    ->where('user_id', $userId)
                    ->with(['client:id,name'])
                    ->orderByDesc('id')
                    ->limit(5)
                    ->get(['id', 'number', 'status', 'total', 'currency']),
                'recent_invoices' => Invoice::query()
                    ->where('user_id', $userId)
                    ->where('document_type', 'invoice')
                    ->with(['client:id,name'])
                    ->orderByDesc('id')
                    ->limit(5)
                    ->get(['id', 'number', 'status', 'due_date']),
            ]
        );

        return response()->json($payload);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSummary(int $userId, User $user): array
    {
        $now = CarbonImmutable::now();
        $currentMonthStart = $now->startOfMonth();
        $currentMonthEnd = $now->endOfMonth();
        $previousMonthStart = $currentMonthStart->subMonth();
        $previousMonthEnd = $previousMonthStart->endOfMonth();

        $clientsCount = Client::query()->where('user_id', $userId)->count();

        $quotesByStatus = Quote::query()
            ->select('status', DB::raw('count(*) as count'))
            ->where('user_id', $userId)
            ->groupBy('status')
            ->pluck('count', 'status')
            ->all();

        $invoicesByStatus = Invoice::query()
            ->select('status', DB::raw('count(*) as count'))
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->all();

        $globalTotals = (object) [
            'revenue_paid' => PaymentAnalytics::totalRevenue($userId),
            'outstanding' => PaymentAnalytics::outstandingBalance($userId),
        ];

        $revenuePaid = (float) ($globalTotals->revenue_paid ?? 0);
        $outstanding = (float) ($globalTotals->outstanding ?? 0);

        $monthlyMetrics = Invoice::query()
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->selectRaw(
                "coalesce(sum(case when status in ('sent', 'overdue') and created_at between ? and ? then total else 0 end), 0) as outstanding_current,
                 coalesce(sum(case when status in ('sent', 'overdue') and created_at between ? and ? then total else 0 end), 0) as outstanding_previous,
                 coalesce(sum(case when status = 'overdue' and created_at between ? and ? then 1 else 0 end), 0) as overdue_current,
                 coalesce(sum(case when status = 'overdue' and created_at between ? and ? then 1 else 0 end), 0) as overdue_previous",
                [
                    $currentMonthStart, $currentMonthEnd,
                    $previousMonthStart, $previousMonthEnd,
                    $currentMonthStart, $currentMonthEnd,
                    $previousMonthStart, $previousMonthEnd,
                ]
            )
            ->first();

        $paidCurrentMonth = PaymentAnalytics::revenueBetween($userId, $currentMonthStart, $currentMonthEnd);
        $paidPreviousMonth = PaymentAnalytics::revenueBetween($userId, $previousMonthStart, $previousMonthEnd);
        $outstandingCurrentMonth = (float) ($monthlyMetrics->outstanding_current ?? 0);
        $outstandingPreviousMonth = (float) ($monthlyMetrics->outstanding_previous ?? 0);
        $avgInvoiceCurrentMonth = PaymentAnalytics::averagePaymentBetween($userId, $currentMonthStart, $currentMonthEnd);
        $avgInvoicePreviousMonth = PaymentAnalytics::averagePaymentBetween($userId, $previousMonthStart, $previousMonthEnd);
        $overdueCurrentMonth = (int) ($monthlyMetrics->overdue_current ?? 0);
        $overduePreviousMonth = (int) ($monthlyMetrics->overdue_previous ?? 0);

        $clientMonthCounts = Client::query()
            ->where('user_id', $userId)
            ->selectRaw(
                'coalesce(sum(case when created_at between ? and ? then 1 else 0 end), 0) as current_count,
                 coalesce(sum(case when created_at between ? and ? then 1 else 0 end), 0) as previous_count',
                [
                    $currentMonthStart, $currentMonthEnd,
                    $previousMonthStart, $previousMonthEnd,
                ]
            )
            ->first();

        $clientsCurrentMonth = (int) ($clientMonthCounts->current_count ?? 0);
        $clientsPreviousMonth = (int) ($clientMonthCounts->previous_count ?? 0);

        $recoveryCurrentMonth = $paidCurrentMonth + $outstandingCurrentMonth > 0
            ? ($paidCurrentMonth / ($paidCurrentMonth + $outstandingCurrentMonth)) * 100
            : 0.0;
        $recoveryPreviousMonth = $paidPreviousMonth + $outstandingPreviousMonth > 0
            ? ($paidPreviousMonth / ($paidPreviousMonth + $outstandingPreviousMonth)) * 100
            : 0.0;

        $rangeStart = $now->startOfMonth()->subMonths(5);
        $rangeEnd = $now->endOfMonth();

        $monthlyPaidRows = PaymentAnalytics::monthlyRevenue($userId, $rangeStart, $rangeEnd);

        $monthlyRevenue = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = $now->startOfMonth()->subMonths($i);
            $key = $month->format('Y-m');
            $monthlyRevenue[] = [
                'month' => $key,
                'label' => $month->locale('fr')->translatedFormat('M'),
                'total' => (float) ($monthlyPaidRows[$key] ?? 0),
            ];
        }

        return [
            'clients_count' => $clientsCount,
            'quotes_by_status' => $quotesByStatus,
            'invoices_by_status' => $invoicesByStatus,
            'revenue_paid_cfa' => $revenuePaid,
            'outstanding_cfa' => $outstanding,
            'monthly_revenue_cfa' => $monthlyRevenue,
            'kpi_trends' => [
                'revenue_paid_pct' => $this->pctChange($paidCurrentMonth, $paidPreviousMonth),
                'outstanding_pct' => $this->pctChange($outstandingCurrentMonth, $outstandingPreviousMonth),
                'recovery_rate_points' => round($recoveryCurrentMonth - $recoveryPreviousMonth, 1),
                'avg_invoice_pct' => $this->pctChange($avgInvoiceCurrentMonth, $avgInvoicePreviousMonth),
                'clients_pct' => $this->pctChange($clientsCurrentMonth, $clientsPreviousMonth),
                'overdue_pct' => $this->pctChange($overdueCurrentMonth, $overduePreviousMonth),
            ],
            'plan_features' => PlanFeatures::forUser($user),
        ];
    }

    public function exportCsv(Request $request): StreamedResponse|JsonResponse
    {
        if (! PlanFeatures::canExportCsv($request->user()->plan)) {
            return response()->json([
                'message' => "L'export CSV est réservé à l'offre Pro.",
            ], 403);
        }

        $userId = (int) $request->user()->id;
        $period = (string) $request->query('period', 'year');
        $now = CarbonImmutable::now();

        $start = match ($period) {
            'week' => $now->startOfWeek(),
            'month' => $now->startOfMonth(),
            'quarter' => $now->firstOfQuarter(),
            default => $now->startOfYear(),
        };

        $rows = Payment::query()
            ->join('invoices', 'payments.invoice_id', '=', 'invoices.id')
            ->where('invoices.user_id', $userId)
            ->where('invoices.document_type', 'invoice')
            ->whereBetween('payments.paid_at', [$start, $now])
            ->orderBy('payments.paid_at')
            ->get([
                'invoices.number',
                'payments.amount',
                'invoices.currency',
                'payments.paid_at',
                'invoices.client_id',
            ]);

        $filename = 'revenus-'.$period.'-'.$now->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Numero', 'Montant', 'Devise', 'Date paiement', 'Client ID'], ';');
            foreach ($rows as $row) {
                fputcsv($out, [
                    $row->number,
                    $row->amount,
                    $row->currency,
                    $row->paid_at?->format('Y-m-d'),
                    $row->client_id,
                ], ';');
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
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
