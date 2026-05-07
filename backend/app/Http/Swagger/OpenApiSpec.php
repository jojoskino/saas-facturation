<?php

declare(strict_types=1);

namespace App\Http\Swagger;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    title: 'Facturo API',
    description: 'API REST : authentification (Sanctum), clients, devis, factures, synthèse tableau de bord.'
)]
#[OA\Server(
    url: 'http://localhost:8000',
    description: 'API locale — aligner avec APP_URL et L5_SWAGGER_CONST_HOST dans .env'
)]
#[OA\SecurityScheme(
    securityScheme: 'sanctum',
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'Token',
    description: 'Token Sanctum : header Authorization: Bearer {token}'
)]
#[OA\Tag(name: 'Auth', description: 'Inscription, connexion, session')]
#[OA\Tag(name: 'Clients', description: 'Clients')]
#[OA\Tag(name: 'Devis', description: 'Devis et lignes')]
#[OA\Tag(name: 'Factures', description: 'Factures')]
#[OA\Tag(name: 'Dashboard', description: 'Synthèse')]
final class OpenApiSpec
{
}
