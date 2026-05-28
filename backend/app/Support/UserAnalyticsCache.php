<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class UserAnalyticsCache
{
    public static function dashboardKey(int $userId): string
    {
        return "analytics.dashboard.{$userId}";
    }

    public static function dashboardHomeKey(int $userId): string
    {
        return "analytics.dashboard.home.{$userId}";
    }

    public static function reportsKey(int $userId, string $period): string
    {
        return "analytics.reports.{$userId}.{$period}";
    }

    public static function bust(int $userId): void
    {
        Cache::forget(self::dashboardKey($userId));
        Cache::forget(self::dashboardHomeKey($userId));
        foreach (['month', 'quarter', 'year'] as $period) {
            Cache::forget(self::reportsKey($userId, $period));
        }
    }
}
