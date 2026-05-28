export default function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite" aria-label="Chargement">
      <div className="route-fallback__spinner" />
    </div>
  );
}
