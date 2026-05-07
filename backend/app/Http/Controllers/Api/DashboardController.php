<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Quote;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        ]);
    }
}
