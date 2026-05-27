<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('stripe_customer_id', 64)->nullable()->after('plan');
            $table->string('stripe_subscription_id', 64)->nullable()->after('stripe_customer_id');
            $table->string('billing_status', 32)->nullable()->after('stripe_subscription_id');
            $table->timestamp('plan_period_end')->nullable()->after('billing_status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'stripe_customer_id',
                'stripe_subscription_id',
                'billing_status',
                'plan_period_end',
            ]);
        });
    }
};
