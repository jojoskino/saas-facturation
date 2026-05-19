<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function index(Request $request, string $invoiceId): JsonResponse
    {
        $invoice = $this->findInvoice($request, $invoiceId);

        return response()->json([
            'payments' => $invoice->payments()->orderByDesc('paid_at')->get(),
            'paid_total' => (float) $invoice->payments()->sum('amount'),
            'balance_due' => $this->balanceDue($invoice),
        ]);
    }

    public function store(Request $request, string $invoiceId): JsonResponse
    {
        $invoice = $this->findInvoice($request, $invoiceId);

        if ($invoice->document_type === 'credit_note') {
            return response()->json(['message' => 'Les avoirs ne reçoivent pas de paiements.'], 422);
        }

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['nullable', 'string', 'max:64'],
            'reference' => ['nullable', 'string', 'max:128'],
            'paid_at' => ['nullable', 'date'],
        ]);

        $balance = $this->balanceDue($invoice);
        if ((float) $data['amount'] > $balance + 0.001) {
            return response()->json([
                'message' => 'Le montant dépasse le solde restant dû.',
                'balance_due' => $balance,
            ], 422);
        }

        $payment = $invoice->payments()->create([
            'amount' => round((float) $data['amount'], 2),
            'method' => $data['method'] ?? null,
            'reference' => $data['reference'] ?? null,
            'paid_at' => isset($data['paid_at']) ? Carbon::parse($data['paid_at']) : now(),
        ]);

        $this->syncInvoicePaymentStatus($invoice->fresh(['payments']));

        return response()->json([
            'message' => 'Paiement enregistré.',
            'payment' => $payment,
            'invoice' => $invoice->fresh(['client:id,name', 'payments']),
            'balance_due' => $this->balanceDue($invoice->fresh(['payments'])),
        ], 201);
    }

    public function destroy(Request $request, string $invoiceId, string $paymentId): Response
    {
        $invoice = $this->findInvoice($request, $invoiceId);

        $payment = Payment::query()
            ->where('invoice_id', $invoice->id)
            ->whereKey($paymentId)
            ->firstOrFail();

        $payment->delete();
        $this->syncInvoicePaymentStatus($invoice->fresh(['payments']));

        return response()->noContent();
    }

    private function findInvoice(Request $request, string $invoiceId): Invoice
    {
        return Invoice::query()
            ->where('user_id', $request->user()->id)
            ->with('payments')
            ->findOrFail($invoiceId);
    }

    private function balanceDue(Invoice $invoice): float
    {
        $paid = (float) $invoice->payments->sum('amount');

        return max(0, round((float) $invoice->total - $paid, 2));
    }

    private function syncInvoicePaymentStatus(Invoice $invoice): void
    {
        if ($invoice->document_type === 'credit_note') {
            return;
        }

        $balance = $this->balanceDue($invoice);

        if ($balance <= 0.001 && (float) $invoice->total > 0) {
            $invoice->update([
                'status' => 'paid',
                'paid_at' => $invoice->paid_at ?? now(),
            ]);

            return;
        }

        if ($invoice->status === 'paid' && $balance > 0) {
            $dueDate = $invoice->due_date?->toDateString() ?? now()->toDateString();
            $status = Carbon::parse($dueDate)->isPast() && ! Carbon::parse($dueDate)->isToday()
                ? 'overdue'
                : 'sent';
            $invoice->update([
                'status' => $status,
                'paid_at' => null,
            ]);
        }
    }
}
