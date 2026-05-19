<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('company_logo_path')->nullable()->after('company_legal_footer');
            $table->string('document_color_primary', 7)->nullable()->after('company_logo_path');
            $table->string('document_color_accent', 7)->nullable()->after('document_color_primary');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'company_logo_path',
                'document_color_primary',
                'document_color_accent',
            ]);
        });
    }
};
