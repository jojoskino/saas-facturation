<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('document_type', 16);
            $table->unsignedBigInteger('document_id');
            $table->string('action', 32);
            $table->string('title');
            $table->text('detail');
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['document_type', 'document_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_activity_logs');
    }
};
