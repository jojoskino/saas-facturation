<?php

use App\Support\Utf8;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->expectsJson()) {
                return null;
            }

            $message = 'Une erreur serveur est survenue.';
            $status = 500;

            if ($e instanceof QueryException) {
                $status = 503;
                $message = "Le service de base de donnees est indisponible pour le moment.";
            } elseif ($e->getMessage() !== '') {
                $message = Utf8::clean($e->getMessage());
            }

            return response()->json(
                ['message' => $message],
                $status,
                [],
                JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
            );
        });
    })->create();
