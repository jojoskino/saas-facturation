export default function ListPagination({ page, lastPage, loading, onPrev, onNext, prevLabel = "Précédent", nextLabel = "Suivant" }) {
  return (
    <div className="app-list-pagination">
      <span className="app-list-pagination__info">
        Page {page} / {lastPage}
      </span>
      <button className="app-list-pagination__btn" type="button" disabled={page <= 1 || loading} onClick={onPrev}>
        {prevLabel}
      </button>
      <button
        className="app-list-pagination__btn"
        type="button"
        disabled={page >= lastPage || loading}
        onClick={onNext}
      >
        {nextLabel}
      </button>
    </div>
  );
}
