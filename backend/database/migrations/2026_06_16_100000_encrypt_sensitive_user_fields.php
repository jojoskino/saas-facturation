<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var list<string> */
    private array $encryptedFields = [
        'company_tax_id',
        'company_bank_iban',
        'company_bank_bic',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        $rows = DB::table('users')->get(['id', ...$this->encryptedFields]);

        foreach ($rows as $row) {
            $updates = [];

            foreach ($this->encryptedFields as $field) {
                $value = $row->{$field} ?? null;
                if (! is_string($value) || $value === '' || $this->looksEncrypted($value)) {
                    continue;
                }

                $updates[$field] = Crypt::encryptString($value);
            }

            if ($updates !== []) {
                DB::table('users')->where('id', $row->id)->update($updates);
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        $rows = DB::table('users')->get(['id', ...$this->encryptedFields]);

        foreach ($rows as $row) {
            $updates = [];

            foreach ($this->encryptedFields as $field) {
                $value = $row->{$field} ?? null;
                if (! is_string($value) || $value === '' || ! $this->looksEncrypted($value)) {
                    continue;
                }

                try {
                    $updates[$field] = Crypt::decryptString($value);
                } catch (\Throwable) {
                    continue;
                }
            }

            if ($updates !== []) {
                DB::table('users')->where('id', $row->id)->update($updates);
            }
        }
    }

    private function looksEncrypted(string $value): bool
    {
        return str_starts_with($value, 'eyJpdiI6');
    }
};
