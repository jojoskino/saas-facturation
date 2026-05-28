export function ListFilterGrid({ cols = 2, children }) {
  const gridClass = cols === 3 ? "app-list-filter__grid app-list-filter__grid--3" : "app-list-filter__grid";
  return <div className={gridClass}>{children}</div>;
}

export function ListFilterField({ label, children }) {
  return (
    <div className="app-list-filter__field">
      {label ? <label>{label}</label> : null}
      {children}
    </div>
  );
}

export default function ListFilterBar({ children, className = "" }) {
  return <section className={`app-list-filter doc-filter-bar ${className}`.trim()}>{children}</section>;
}
