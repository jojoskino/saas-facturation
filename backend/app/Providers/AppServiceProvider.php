<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth', function (Request $request): array {
            $email = (string) $request->input('email', '');
            $ip = (string) $request->ip();

            return [
                Limit::perMinute(10)->by($ip),
                Limit::perMinute(5)->by(mb_strtolower($email).'|'.$ip),
            ];
        });

        RateLimiter::for('password-update', function (Request $request): Limit {
            $id = (string) optional($request->user())->id;
            $ip = (string) $request->ip();

            return Limit::perMinute(5)->by($id.'|'.$ip);
        });
    }
}
