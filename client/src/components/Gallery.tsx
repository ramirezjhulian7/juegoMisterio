import { useMemo, useState } from "react";
import type { Evidence } from "../types";

interface Props {
  evidence: Evidence[];
  onOpen: (index: number) => void;
}

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Todo" },
  { key: "witness", label: "Testigos" },
  { key: "suspect", label: "Sospechosos" },
  { key: "letter", label: "Cartas" },
  { key: "call", label: "Llamadas" },
  { key: "article", label: "Prensa" },
  { key: "other", label: "Otros" },
];

export default function Gallery({ evidence, onOpen }: Props) {
  const [filter, setFilter] = useState("all");

  // Filtros que realmente tienen contenido
  const available = useMemo(() => {
    const types = new Set(evidence.map((e) => e.type));
    return FILTERS.filter((f) => f.key === "all" || types.has(f.key));
  }, [evidence]);

  const shown = evidence.filter((e) => filter === "all" || e.type === filter);

  return (
    <>
      <div className="evidence-toolbar">
        {available.map((f) => (
          <button key={f.key} className={filter === f.key ? "on" : ""} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="gallery">
        {shown.map((e) => {
          // indice real dentro de la lista completa (para navegar en el visor)
          const realIndex = evidence.findIndex((x) => x.id === e.id);
          return (
            <div key={e.id} className="ev-thumb" onClick={() => onOpen(realIndex)}>
              <img src={`/uploads/${e.image_path}`} alt={e.title} loading="lazy" />
              <div className="cap">
                <div className="tag">{e.type}</div>
                {e.title}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
