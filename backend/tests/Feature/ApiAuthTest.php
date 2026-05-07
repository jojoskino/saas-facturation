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
}
