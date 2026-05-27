<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

class PasswordRules
{
  /**
   * Politique : 8 caractères min., lettre, chiffre et symbole.
   */
  public static function rule(): Password
  {
    return Password::min(8)
      ->letters()
      ->numbers()
      ->symbols();
  }

  /**
   * @return list<string|Password>
   */
  public static function attributeRules(bool $confirmed = true): array
  {
    $rules = ['required', 'string', self::rule()];

    if ($confirmed) {
      $rules[] = 'confirmed';
    }

    return $rules;
  }

  /**
   * @return array<string, string>
   */
  public static function messages(): array
  {
    return [
      'password.required' => 'Le mot de passe est obligatoire.',
      'password.min' => 'Le mot de passe doit contenir au moins :min caractères.',
      'password.letters' => 'Le mot de passe doit contenir au moins une lettre.',
      'password.numbers' => 'Le mot de passe doit contenir au moins un chiffre.',
      'password.symbols' => 'Le mot de passe doit contenir au moins un caractère spécial.',
      'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
    ];
  }
}
