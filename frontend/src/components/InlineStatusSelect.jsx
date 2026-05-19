import { AppSelect } from "./AppFormControls";

/** Changement de statut directement dans un tableau (sans ouvrir le formulaire). */
export default function InlineStatusSelect({ value, onChange, options, disabled = false }) {
  return (
    <div className="inline-status-select" onClick={(e) => e.stopPropagation()}>
      <AppSelect value={value} onChange={onChange} options={options} disabled={disabled} />
    </div>
  );
}
