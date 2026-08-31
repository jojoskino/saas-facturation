<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AccountDeletionService
{
    public function delete(User $user): void
    {
        DB::transaction(function () use ($user): void {
            $user->tokens()->delete();

            if ($user->company_logo_path) {
                Storage::disk('public')->delete($user->company_logo_path);
            }

            $user->invoices()->withTrashed()->forceDelete();
            $user->quotes()->withTrashed()->forceDelete();
            $user->clients()->delete();
            $user->delete();
        });
    }
}
