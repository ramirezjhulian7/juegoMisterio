import type { Hint } from "../types";

interface Props {
  hints: Hint[];
  revealed: number[];
  onReveal: () => void;
}

export default function Hints({ hints, revealed, onReveal }: Props) {
  const revealedSet = new Set(revealed);
  const shown = hints.filter((h) => revealedSet.has(h.id));
  const remaining = hints.length - shown.length;

  return (
    <div className="hints">
      <h3>💡 Pistas ({shown.length}/{hints.length})</h3>
      {shown.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          ¿Atascados? Revelen una pista. Se comparte con todo el equipo.
        </p>
      )}
      {shown.map((h, i) => (
        <div key={h.id} className="hint-item">
          <span className="hint-n">{i + 1}</span> {h.text}
        </div>
      ))}
      {remaining > 0 ? (
        <button className="hint-btn" onClick={onReveal}>
          Revelar pista ({remaining} restantes)
        </button>
      ) : (
        hints.length > 0 && (
          <p style={{ color: "var(--muted)", fontSize: 12 }}>No quedan más pistas.</p>
        )
      )}
    </div>
  );
}
