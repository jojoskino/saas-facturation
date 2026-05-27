<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_does_not_return_token(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['message', 'user' => ['id', 'name', 'email', 'plan', 'plan_features']])
            ->assertJsonMissing(['token']);

        $this->assertDatabaseHas('users', ['email' => 'test@example.com', 'plan' => 'free']);
    }

    public function test_verify_password(): void
    {
        $user = User::factory()->create([
            'email' => 'verify@example.com',
            'password' => 'Secret1!ab',
        ]);

        $login = $this->postJson('/api/login', [
            'email' => 'verify@example.com',
            'password' => 'Secret1!ab',
        ]);
        $token = $login->json('token');

        $this->postJson('/api/me/verify-password', ['password' => 'wrong'], [
            'Authorization' => 'Bearer '.$token,
        ])->assertUnprocessable();

        $this->postJson('/api/me/verify-password', ['password' => 'Secret1!ab'], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk()->assertJsonPath('valid', true);
    }

    public function test_register_rejects_weak_password(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'weak@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    }

    public function test_login_and_me(): void
    {
        $user = User::factory()->create([
            'email' => 'auth@example.com',
            'password' => 'Secret1!ab',
        ]);

        $login = $this->postJson('/api/login', [
            'email' => 'auth@example.com',
            'password' => 'Secret1!ab',
        ]);

        $login->assertOk()->assertJsonStructure(['token']);

        $token = $login->json('token');

        $this->getJson('/api/me', ['Authorization' => 'Bearer '.$token])
            ->assertOk()
            ->assertJsonPath('email', 'auth@example.com');
    }

    public function test_company_profile_update(): void
    {
        $user = User::factory()->create([
            'email' => 'company@example.com',
            'password' => 'Secret1!ab',
        ]);

        $login = $this->postJson('/api/login', [
            'email' => 'company@example.com',
            'password' => 'Secret1!ab',
        ]);
        $token = $login->json('token');

        $this->putJson(
            '/api/me/company-profile',
            [
                'company_name' => 'ACME SARL',
                'company_address' => "12 rue de la Paix\nAbidjan",
                'company_phone' => '+225 07 00 00 00 00',
                'company_email' => 'contact@acme.ci',
                'company_tax_id' => 'CI-NIF-123',
                'company_bank_name' => 'SGBCI',
                'company_bank_iban' => 'CI93CI0020100100123456789012',
                'company_bank_bic' => 'SGCICIAB',
                'company_legal_footer' => 'Capital : 1 000 000 XOF',
            ],
            ['Authorization' => 'Bearer '.$token]
        )
            ->assertOk()
            ->assertJsonPath('user.company_name', 'ACME SARL')
            ->assertJsonPath('user.company_tax_id', 'CI-NIF-123');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'company_name' => 'ACME SARL',
            'company_email' => 'contact@acme.ci',
        ]);
    }
}
