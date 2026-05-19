<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_returns_token(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['user' => ['id', 'name', 'email'], 'token', 'token_type']);

        $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
    }

    public function test_login_and_me(): void
    {
        $user = User::factory()->create([
            'email' => 'auth@example.com',
            'password' => 'secret4567',
        ]);

        $login = $this->postJson('/api/login', [
            'email' => 'auth@example.com',
            'password' => 'secret4567',
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
            'password' => 'secret4567',
        ]);

        $login = $this->postJson('/api/login', [
            'email' => 'company@example.com',
            'password' => 'secret4567',
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
