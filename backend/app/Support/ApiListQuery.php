<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ApiListQuery
{
    public static function perPage(Request $request, int $default = 25, int $max = 100): int
    {
        return max(1, min((int) $request->query('per_page', $default), $max));
    }

    public static function page(Request $request): int
    {
        return max(1, (int) $request->query('page', 1));
    }

    /**
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $query
     */
    public static function applySearch(Builder $query, ?string $q, array $columns): void
    {
        $term = trim((string) $q);
        if ($term === '') {
            return;
        }

        $like = '%'.$term.'%';
        $query->where(function (Builder $sub) use ($like, $columns): void {
            foreach ($columns as $column) {
                $sub->orWhere($column, 'like', $like);
            }
        });
    }
}
