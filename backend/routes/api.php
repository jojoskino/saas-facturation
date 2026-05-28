<?php

use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\StripeWebhookController;
use App\Http\Controllers\Api\ReportsController;
use Illuminate\Support\Facades\Route;

Route::post('/stripe/webhook', [StripeWebhookController::class, 'handle']);

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:auth');

Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
    Route::match(['put', 'post'], '/me/company-profile', [AuthController::class, 'updateCompanyProfile']);
    Route::put('/me/settings', [AuthController::class, 'updateSettings']);
    Route::put('/me/password', [AuthController::class, 'updatePassword'])->middleware('throttle:password-update');
    Route::post('/me/verify-password', [AuthController::class, 'verifyPassword'])->middleware('throttle:password-update');
    Route::post('/email/verification-notification', [AuthController::class, 'resendVerification'])->middleware('throttle:6,1');

    Route::get('/billing', [BillingController::class, 'show']);
    Route::post('/billing/checkout', [BillingController::class, 'checkout']);
    Route::post('/billing/portal', [BillingController::class, 'portal']);
    Route::post('/billing/simulate', [BillingController::class, 'simulate']);

    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('/dashboard/home', [DashboardController::class, 'home']);
    Route::get('/dashboard/export', [DashboardController::class, 'exportCsv']);

    Route::get('/reports/summary', [ReportsController::class, 'summary']);

    Route::post('/clients/import', [ClientController::class, 'importCsv']);
    Route::get('/clients/{id}/documents', [ClientController::class, 'documents']);
    Route::apiResource('clients', ClientController::class);

    Route::post('/quotes/{id}/convert-to-invoice', [QuoteController::class, 'convertToInvoice']);
    Route::get('/quotes/{id}/preview', [QuoteController::class, 'preview']);
    Route::get('/quotes/{id}/pdf', [QuoteController::class, 'pdf']);
    Route::apiResource('quotes', QuoteController::class);

    Route::get('/invoices/{id}/preview', [InvoiceController::class, 'preview']);
    Route::get('/invoices/{id}/pdf', [InvoiceController::class, 'pdf']);
    Route::post('/invoices/{id}/credit-note', [InvoiceController::class, 'createCreditNote']);
    Route::get('/invoices/{invoice}/payments', [PaymentController::class, 'index']);
    Route::post('/invoices/{invoice}/payments', [PaymentController::class, 'store']);
    Route::delete('/invoices/{invoice}/payments/{payment}', [PaymentController::class, 'destroy']);
    Route::apiResource('invoices', InvoiceController::class);
});
