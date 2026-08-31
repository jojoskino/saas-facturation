<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSwaggerEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! filter_var(env('L5_SWAGGER_ENABLED', false), FILTER_VALIDATE_BOOL)) {
            abort(404);
        }

        return $next($request);
    }
}
