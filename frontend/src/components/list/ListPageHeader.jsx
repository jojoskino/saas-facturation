export default function ListPageHeader({ title, count, actions }) {
  return (
    <>
      <div className="app-list-header">
        <h2>{title}</h2>
        {actions ? <div className="app-list-header__actions">{actions}</div> : null}
      </div>
      {count != null && count !== "" ? <p className="app-list-count">{count}</p> : null}
    </>
  );
}
