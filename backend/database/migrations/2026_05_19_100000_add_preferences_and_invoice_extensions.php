<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('locale', 8)->default('fr')->after('company_legal_footer');
            $table->string('timezone', 64)->default('Africa/Abidjan')->after('locale');
            $table->boolean('notifications_email')->default(true)->after('timezone');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->string('document_type', 32)->default('invoice')->after('quote_id');
            $table->foreignId('parent_invoice_id')->nullable()->after('document_type')->constrained('invoices')->nullOnDelete();
        });

        Schema::table('quotes', function (Blueprint $table) {
            $table->decimal('discount_percent', 5, 2)->default(0)->after('total');
        });
    }

    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropColumn('discount_percent');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['parent_invoice_id']);
            $table->dropColumn(['document_type', 'parent_invoice_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['locale', 'timezone', 'notifications_email']);
        });
    }
};
