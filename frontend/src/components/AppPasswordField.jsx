import { useId, useState } from "react";
import { FieldLabel } from "./AppFormControls";

/**
 * Champ mot de passe pour modales / pages app (bordure, icônes, toggle visibilité).
 */
export default function AppPasswordField({
  id: idProp,
  label = "Mot de passe",
  value,
  onChange,
  placeholder = "Saisissez votre mot de passe",
  autoComplete = "current-password",
  autoFocus = false,
  required = true,
}) {
  const reactId = useId();
  const inputId = idProp || `app-pwd-${reactId}`;
  const [show, setShow] = useState(false);

  return (
    <div className="app-modal-pass-field">
      <FieldLabel htmlFor={inputId} required={required}>
        {label}
      </FieldLabel>
      <div className="app-modal-pass-wrap">
        <i className="fa-solid fa-lock app-modal-pass-icon" aria-hidden />
        <input
          id={inputId}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="app-modal-pass-toggle"
          onClick={() => setShow((prev) => !prev)}
          aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          tabIndex={-1}
        >
          <i className={`fa-solid ${show ? "fa-eye-slash" : "fa-eye"}`} aria-hidden />
        </button>
      </div>
    </div>
  );
}
