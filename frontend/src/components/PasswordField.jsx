import { useId, useState } from "react";
import { FieldLabel } from "./AppFormControls";

export default function PasswordField({
  label,
  id: idProp,
  value,
  onChange,
  placeholder,
  leadingIcon = "fa-lock",
  autoComplete = "current-password",
  minLength,
  required = true,
  pattern,
  title,
}) {
  const reactId = useId();
  const inputId = idProp || `pwd-${reactId}`;
  const [show, setShow] = useState(false);

  return (
    <div className="auth-field">
      <FieldLabel htmlFor={inputId} required={required}>
        {label}
      </FieldLabel>
      <div className="auth-pass-wrap">
        <i className={`fa-solid ${leadingIcon} auth-input-icon`} aria-hidden />
        <input
          id={inputId}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minLength={minLength}
          pattern={pattern}
          title={title}
          required={required}
        />
        <button
          type="button"
          className="auth-pass-toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          <i className={`fa-solid ${show ? "fa-eye-slash" : "fa-eye"}`} aria-hidden />
        </button>
      </div>
    </div>
  );
}
