/**
 * Page module minimaliste — même structure pour tous les modules à venir.
 */
export default function ModulePlaceholder({ title, description }) {
  return (
    <div className="mod">
      <style>{`
        .mod {
          border-radius: 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          padding: 28px 24px;
          max-width: 720px;
        }
        .mod h2 {
          font-family: var(--heading);
          font-size: 1.35rem;
          margin: 0 0 10px;
          letter-spacing: -0.02em;
        }
        .mod p {
          margin: 0;
          color: var(--color-text-muted);
          line-height: 1.6;
          font-size: 15px;
        }
      `}</style>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
