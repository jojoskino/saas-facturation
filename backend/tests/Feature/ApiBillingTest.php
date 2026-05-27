<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        $user = User::factory()->create(['plan' => 'free']);

        $this->actingAs($user)
            ->getJson('/api/billing')
            ->assertOk()
            ->assertJsonPath('plan', 'free')
            ->assertJsonStructure([
                'configured',
                'simulation',
                'mode',
                'plan',
                'billing_status',
                'plans',
                'plan_features',
            ]);
    }

    public function test_checkout_returns_simulation_confirmation_when_stripe_not_configured(): void
    {
        config([
            'billing.mode' => 'auto',
            'billing.stripe.secret' => null,
            'billing.stripe.price_pro' => null,
        ]);

        $user = User::factory()->create(['plan' => 'free']);

        $this->actingAs($user)
            ->getJson('/api/billing')
            ->assertOk()
            ->assertJsonPath('simulation', true)
            ->assertJsonPath('configured', true);

        $this->actingAs($user)
            ->postJson('/api/billing/checkout', ['plan' => 'pro'])
            ->assertOk()
            ->assertJsonPath('mode', 'simulation')
            ->assertJsonPath('requires_confirmation', true);
    }

    public function test_simulated_checkout_activates_pro_plan(): void
    {
        config([
            'billing.mode' => 'simulation',
            'billing.stripe.secret' => null,
            'billing.stripe.price_pro' => null,
        ]);

        $user = User::factory()->create(['plan' => 'free']);

        $this->actingAs($user)
            ->postJson('/api/billing/simulate', [
                'action' => 'checkout_pro',
                'card' => [
                    'brand' => 'visa',
                    'last4' => '4242',
                    'exp_month' => 12,
                    'exp_year' => 2028,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('billing.plan', 'pro')
            ->assertJsonPath('payment_method.last4', '4242');

        $user->refresh();
        $this->assertSame('pro', $user->plan);
        $this->assertSame('active', $user->billing_status);
    }

    public function test_simulated_portal_change_plan_and_cancel(): void
    {
        config(['billing.mode' => 'simulation']);

        $user = User::factory()->create([
            'plan' => 'pro',
            'billing_status' => 'active',
            'stripe_customer_id' => 'sim_cus_1',
            'stripe_subscription_id' => 'sim_sub_1',
        ]);

        $this->actingAs($user)
            ->postJson('/api/billing/portal')
            ->assertOk()
            ->assertJsonPath('mode', 'simulation')
            ->assertJsonPath('portal', true);

        $this->actingAs($user)
            ->postJson('/api/billing/simulate', [
                'action' => 'change_plan',
                'plan' => 'enterprise',
            ])
            ->assertOk()
            ->assertJsonPath('billing.plan', 'enterprise');

        $this->actingAs($user)
            ->postJson('/api/billing/simulate', ['action' => 'cancel'])
            ->assertOk()
            ->assertJsonPath('billing.plan', 'free')
            ->assertJsonPath('billing.billing_status', 'canceled');
    }

    public function test_simulate_endpoint_rejected_when_stripe_mode(): void
    {
        config([
            'billing.mode' => 'stripe',
            'billing.stripe.secret' => 'sk_test_x',
            'billing.stripe.price_pro' => 'price_x',
        ]);

        $user = User::factory()->create(['plan' => 'free']);

        $this->actingAs($user)
            ->postJson('/api/billing/simulate', ['action' => 'checkout_pro'])
            ->assertForbidden();
    }
}
