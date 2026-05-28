<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->index(['user_id', 'paid_at'], 'invoices_user_paid_at_idx');
            $table->index(['user_id', 'issue_date'], 'invoices_user_issue_date_idx');
            $table->index(['user_id', 'document_type'], 'invoices_user_doc_type_idx');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex('invoices_user_paid_at_idx');
            $table->dropIndex('invoices_user_issue_date_idx');
            $table->dropIndex('invoices_user_doc_type_idx');
        });
    }
};
