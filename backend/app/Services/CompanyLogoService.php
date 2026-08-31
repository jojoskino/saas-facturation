<?php

namespace App\Services;

use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** Normalise les logos entreprise pour un rendu net (UI + PDF). */
class CompanyLogoService
{
    private const MAX_WIDTH = 512;

    private const MAX_HEIGHT = 512;

    /** @var list<string> */
    private const ALLOWED_MIMES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
    ];

    public function store(UploadedFile $file, int $userId): string
    {
        $mime = strtolower((string) ($file->getMimeType() ?: ''));

        if (! in_array($mime, self::ALLOWED_MIMES, true)) {
            throw ValidationException::withMessages([
                'company_logo' => ['Format non autorisé. Utilisez JPEG, PNG, WebP ou GIF.'],
            ]);
        }

        if (! $this->canProcess()) {
            return $file->store('company-logos/'.$userId, 'public');
        }

        $optimized = $this->optimizeRaster($file, $mime);
        if ($optimized === null) {
            return $file->store('company-logos/'.$userId, 'public');
        }

        $filename = 'company-logos/'.$userId.'/'.Str::uuid().'.png';
        Storage::disk('public')->put($filename, $optimized);

        return $filename;
    }

    private function canProcess(): bool
    {
        return extension_loaded('gd') && function_exists('imagecreatetruecolor');
    }

    private function optimizeRaster(UploadedFile $file, string $mime): ?string
    {
        $path = $file->getRealPath();
        if (! is_string($path) || $path === '') {
            return null;
        }

        $source = $this->loadImage($path, $mime);
        if (! $source instanceof GdImage) {
            return null;
        }

        $srcW = imagesx($source);
        $srcH = imagesy($source);
        if ($srcW < 1 || $srcH < 1) {
            imagedestroy($source);

            return null;
        }

        $scale = min(1.0, self::MAX_WIDTH / $srcW, self::MAX_HEIGHT / $srcH);
        $dstW = max(1, (int) round($srcW * $scale));
        $dstH = max(1, (int) round($srcH * $scale));

        $dest = imagecreatetruecolor($dstW, $dstH);
        if ($dest === false) {
            imagedestroy($source);

            return null;
        }

        imagealphablending($dest, false);
        imagesavealpha($dest, true);
        $transparent = imagecolorallocatealpha($dest, 0, 0, 0, 127);
        imagefill($dest, 0, 0, $transparent);
        imagealphablending($dest, true);
        imagecopyresampled($dest, $source, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);
        imagedestroy($source);

        ob_start();
        imagepng($dest, null, 6);
        $binary = ob_get_clean();
        imagedestroy($dest);

        return is_string($binary) && $binary !== '' ? $binary : null;
    }

    private function loadImage(string $path, string $mime): ?GdImage
    {
        return match ($mime) {
            'image/jpeg', 'image/jpg' => @imagecreatefromjpeg($path) ?: null,
            'image/png' => @imagecreatefrompng($path) ?: null,
            'image/webp' => function_exists('imagecreatefromwebp') ? (@imagecreatefromwebp($path) ?: null) : null,
            'image/gif' => @imagecreatefromgif($path) ?: null,
            default => null,
        };
    }
}
