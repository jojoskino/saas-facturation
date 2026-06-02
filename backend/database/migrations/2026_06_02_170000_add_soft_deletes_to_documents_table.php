<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'number']);
            $table->softDeletes();
            $table->index(['user_id', 'deleted_at']);
        });

        Schema::table('quotes', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'number']);
            $table->softDeletes();
            $table->index(['user_id', 'deleted_at']);
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropIndex(['user_id', 'deleted_at']);
            $table->unique(['user_id', 'number']);
        });

        Schema::table('quotes', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropIndex(['user_id', 'deleted_at']);
            $table->unique(['user_id', 'number']);
        });
    }
};
