<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiBillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_billing_summary_requires_auth(): void
    {
        $this->getJson('/api/billing')->assertUnauthorized();
    }

    public function test_billing_summary_for_free_user(): void
    {
        config([
            'billing.stripe.secret' => null,
            'billing.stripe.price_pro' => null,
        ]);

        $user = User::factory()->create(['plan' => 'free']);

        Sanctum::actingAs($user);

        $this->getJson('/api/billing')
            ->assertOk()
            ->assertJsonPath('plan', 'free')
            ->assertJsonPath('configured', false)
            ->assertJsonPath('mode', 'unconfigured')
            ->assertJsonStructure([
                'configured',
                'mode',
                'plan',
                'billing_status',
                'plans',
                'plan_features',
            ]);
    }

    public function test_checkout_unavailable_when_stripe_not_configured(): void
    {
        config([
            'billing.stripe.secret' => null,
            'billing.stripe.price_pro' => null,
        ]);

        $user = User::factory()->create(['plan' => 'free']);

        Sanctum::actingAs($user);

        $this->postJson('/api/billing/checkout', ['plan' => 'pro'])
            ->assertStatus(503);
    }
}
