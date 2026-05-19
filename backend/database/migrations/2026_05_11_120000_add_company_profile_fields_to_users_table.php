<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('company_name')->nullable()->after('password');
            $table->text('company_address')->nullable()->after('company_name');
            $table->string('company_phone', 64)->nullable()->after('company_address');
            $table->string('company_email')->nullable()->after('company_phone');
            $table->string('company_tax_id', 120)->nullable()->after('company_email');
            $table->string('company_bank_name')->nullable()->after('company_tax_id');
            $table->string('company_bank_iban', 64)->nullable()->after('company_bank_name');
            $table->string('company_bank_bic', 32)->nullable()->after('company_bank_iban');
            $table->text('company_legal_footer')->nullable()->after('company_bank_bic');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'company_name',
                'company_address',
                'company_phone',
                'company_email',
                'company_tax_id',
                'company_bank_name',
                'company_bank_iban',
                'company_bank_bic',
                'company_legal_footer',
            ]);
        });
    }
};
