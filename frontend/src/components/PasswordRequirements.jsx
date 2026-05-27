import { evaluatePassword, passwordsMatch } from "../utils/passwordPolicy";

export default function PasswordRequirements({
  password = "",
  confirmPassword,
  showConfirmation = false,
  hiddenUntilTyping = true,
  className = "",
}) {
  const confirm = confirmPassword ?? "";
  const hasStarted =
    password.length > 0 || (showConfirmation && confirm.length > 0);

  if (hiddenUntilTyping && !hasStarted) {
    return null;
  }

  const { checks } = evaluatePassword(password);
  const matchOk = !showConfirmation || passwordsMatch(password, confirm);

  return (
    <ul className={`password-requirements ${className}`.trim()} aria-live="polite">
      {checks.map((check) => (
        <li key={check.id} className={check.met ? "is-met" : "is-unmet"}>
          <i className={`fa-solid ${check.met ? "fa-circle-check" : "fa-circle"}`} aria-hidden />
          <span>{check.label}</span>
        </li>
      ))}
      {showConfirmation ? (
        <li className={matchOk ? "is-met" : "is-unmet"}>
          <i className={`fa-solid ${matchOk ? "fa-circle-check" : "fa-circle"}`} aria-hidden />
          <span>Les deux mots de passe correspondent</span>
        </li>
      ) : null}
    </ul>
  );
}
