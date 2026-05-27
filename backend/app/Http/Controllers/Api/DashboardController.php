<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Support\PlanFeatures;
use App\Models\Invoice;
use App\Models\Quote;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;
use OpenApi\Attributes as OA;

class DashboardController extends Controller
{
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
        $userId = (int) $request->user()->id;
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
            ->groupBy('status')
            ->pluck('count', 'status')
            ->all();

        $revenuePaid = (float) Invoice::query()
            ->where('user_id', $userId)
            ->where('status', 'paid')
            ->sum('total');

        $outstanding = (float) Invoice::query()
            ->where('user_id', $userId)
            ->whereIn('status', ['sent', 'overdue'])
            ->sum('total');

        $paidCurrentMonth = (float) Invoice::query()
            ->where('user_id', $userId)
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$currentMonthStart, $currentMonthEnd])
            ->sum('total');
        $paidPreviousMonth = (float) Invoice::query()
            ->where('user_id', $userId)
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$previousMonthStart, $previousMonthEnd])
            ->sum('total');

        $outstandingCurrentMonth = (float) Invoice::query()
            ->where('user_id', $userId)
            ->whereIn('status', ['sent', 'overdue'])
            ->whereBetween('created_at', [$currentMonthStart, $currentMonthEnd])
            ->sum('total');
        $outstandingPreviousMonth = (float) Invoice::query()
            ->where('user_id', $userId)
            ->whereIn('status', ['sent', 'overdue'])
            ->whereBetween('created_at', [$previousMonthStart, $previousMonthEnd])
            ->sum('total');

        $clientsCurrentMonth = (int) Client::query()
            ->where('user_id', $userId)
            ->whereBetween('created_at', [$currentMonthStart, $currentMonthEnd])
            ->count();
        $clientsPreviousMonth = (int) Client::query()
            ->where('user_id', $userId)
            ->whereBetween('created_at', [$previousMonthStart, $previousMonthEnd])
            ->count();

        $overdueCurrentMonth = (int) Invoice::query()
            ->where('user_id', $userId)
            ->where('status', 'overdue')
            ->whereBetween('created_at', [$currentMonthStart, $currentMonthEnd])
            ->count();
        $overduePreviousMonth = (int) Invoice::query()
            ->where('user_id', $userId)
            ->where('status', 'overdue')
            ->whereBetween('created_at', [$previousMonthStart, $previousMonthEnd])
            ->count();

        $avgInvoiceCurrentMonth = (float) Invoice::query()
            ->where('user_id', $userId)
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$currentMonthStart, $currentMonthEnd])
            ->avg('total');
        $avgInvoicePreviousMonth = (float) Invoice::query()
            ->where('user_id', $userId)
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$previousMonthStart, $previousMonthEnd])
            ->avg('total');

        $recoveryCurrentMonth = $paidCurrentMonth + $outstandingCurrentMonth > 0
            ? ($paidCurrentMonth / ($paidCurrentMonth + $outstandingCurrentMonth)) * 100
            : 0.0;
        $recoveryPreviousMonth = $paidPreviousMonth + $outstandingPreviousMonth > 0
            ? ($paidPreviousMonth / ($paidPreviousMonth + $outstandingPreviousMonth)) * 100
            : 0.0;

        $rangeStart = CarbonImmutable::now()->startOfMonth()->subMonths(5);
        $rangeEnd = CarbonImmutable::now()->endOfMonth();

        $monthlyPaidRows = Invoice::query()
            ->selectRaw("to_char(date_trunc('month', paid_at), 'YYYY-MM') as ym, sum(total) as total")
            ->where('user_id', $userId)
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$rangeStart, $rangeEnd])
            ->groupBy('ym')
            ->orderBy('ym')
            ->get()
            ->pluck('total', 'ym');

        $monthlyRevenue = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = CarbonImmutable::now()->startOfMonth()->subMonths($i);
            $key = $month->format('Y-m');
            $monthlyRevenue[] = [
                'month' => $key,
                'label' => $month->locale('fr')->translatedFormat('M'),
                'total' => (float) ($monthlyPaidRows[$key] ?? 0),
            ];
        }

        return response()->json([
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
            'plan_features' => PlanFeatures::forUser($request->user()),
        ]);
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

        $rows = Invoice::query()
            ->where('user_id', $userId)
            ->where('document_type', 'invoice')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $now])
            ->orderBy('paid_at')
            ->get(['number', 'total', 'currency', 'paid_at', 'client_id']);

        $filename = 'revenus-'.$period.'-'.$now->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Numero', 'Montant', 'Devise', 'Date paiement', 'Client ID'], ';');
            foreach ($rows as $row) {
                fputcsv($out, [
                    $row->number,
                    $row->total,
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
