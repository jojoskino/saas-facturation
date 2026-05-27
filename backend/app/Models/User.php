<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\Utf8;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name',
    'email',
    'password',
    'company_name',
    'company_address',
    'company_phone',
    'company_email',
    'company_tax_id',
    'company_bank_name',
    'company_bank_iban',
    'company_bank_bic',
    'company_legal_footer',
    'company_logo_path',
    'document_color_primary',
    'document_color_accent',
    'locale',
    'timezone',
    'notifications_email',
    'plan',
    'stripe_customer_id',
    'stripe_subscription_id',
    'billing_status',
    'plan_period_end',
    'billing_payment_method',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected static function booted(): void
    {
        static::saving(function (User $user): void {
            if ($user->isDirty('name')) {
                $user->name = Utf8::clean($user->name);
            }
            if ($user->isDirty('email')) {
                $user->email = Utf8::clean($user->email);
            }
            foreach ([
                'company_name',
                'company_address',
                'company_phone',
                'company_email',
                'company_tax_id',
                'company_bank_name',
                'company_bank_iban',
                'company_bank_bic',
                'company_legal_footer',
            ] as $field) {
                if ($user->isDirty($field) && is_string($user->{$field})) {
                    $user->{$field} = Utf8::clean($user->{$field});
                }
            }
        });
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'notifications_email' => 'boolean',
            'plan_period_end' => 'datetime',
            'billing_payment_method' => 'array',
        ];
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification);
    }

    public function sendPasswordResetNotification($token): void
    {
        $frontend = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');
        $url = $frontend.'/reset-password?token='.$token.'&email='.urlencode($this->email);
        $this->notify(new ResetPasswordNotification($url));
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }
}
