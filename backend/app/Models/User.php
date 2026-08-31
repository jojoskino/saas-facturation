<?php

namespace App\Models;

use App\Support\Utf8;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Auth\MustVerifyEmail;
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
    'plan_period_end',
    'billing_payment_method',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, MustVerifyEmail, Notifiable;

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
            'company_tax_id' => 'encrypted',
            'company_bank_iban' => 'encrypted',
            'company_bank_bic' => 'encrypted',
        ];
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification);
    }

    /**
     * Lit un champ sensible (chiffré en base) pour affichage interne (PDF, etc.).
     */
    public function sensitiveFieldValue(string $attribute): ?string
    {
        if (! in_array($attribute, ['company_tax_id', 'company_bank_iban', 'company_bank_bic'], true)) {
            return null;
        }

        $value = $this->getAttribute($attribute);

        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return $value;
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
