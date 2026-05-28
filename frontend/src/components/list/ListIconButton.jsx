export default function ListIconButton({ title, onClick, disabled, danger, spinning, icon, children }) {
  return (
    <button
      type="button"
      className={`app-list-icon-btn${danger ? " app-list-icon-btn--danger" : ""}`}
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      <i className={`fa-solid ${spinning ? "fa-spinner fa-spin" : icon}`} aria-hidden />
      {children}
    </button>
  );
}
