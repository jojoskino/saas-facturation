/** Aligné sur App\Support\PasswordRules (Laravel). */

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_CHECKS = [
  {
    id: "length",
    label: "Au moins 8 caractères",
    test: (value) => value.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "letter",
    label: "Au moins une lettre",
    test: (value) => /[A-Za-z]/.test(value),
  },
  {
    id: "digit",
    label: "Au moins un chiffre",
    test: (value) => /\d/.test(value),
  },
  {
    id: "symbol",
    label: "Au moins un caractère spécial (!@#$…)",
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

export const PASSWORD_POLICY_HINT =
  "8 caractères minimum, avec une lettre, un chiffre et un symbole.";

export function evaluatePassword(password = "") {
  const checks = PASSWORD_CHECKS.map(({ id, label, test }) => ({
    id,
    label,
    met: test(password),
  }));

  return {
    valid: checks.every((check) => check.met),
    checks,
  };
}

export function passwordsMatch(password, confirmation) {
  return password.length > 0 && password === confirmation;
}
