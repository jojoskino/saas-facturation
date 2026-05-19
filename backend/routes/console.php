<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('documents:update-statuses')->dailyAt('06:00');
Schedule::command('documents:update-statuses --remind')->weeklyOn(1, '08:00');
