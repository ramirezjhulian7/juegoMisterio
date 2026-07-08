import type { Suspect, SuspectStatus } from "../types";

interface Props {
  suspects: Suspect[];
  statusOf: (suspectId: number) => SuspectStatus;
  searchedIds: number[];
  searchBudget: number;
  onView: (s: Suspect) => void;
  onStatus: (suspectId: number, status: SuspectStatus) => void;
  onSearch: (suspectId: number) => void;
}

const OPTIONS: { key: SuspectStatus; label: string; cls: string }[] = [
  { key: "prime", label: "Principal", cls: "on-prime" },
  { key: "maybe", label: "Quizá", cls: "on-maybe" },
  { key: "cleared", label: "Descartado", cls: "on-cleared" },
];

export default function Suspects({
  suspects,
  statusOf,
  searchedIds,
  searchBudget,
  onView,
  onStatus,
  onSearch,
}: Props) {
  if (!suspects.length)
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>Este caso no tiene fichas de sospechosos detectadas.</p>;

  const searched = new Set(searchedIds);

  return (
    <>
      {suspects.map((s) => {
        const status = statusOf(s.id);
        const isSearched = searched.has(s.id);
        return (
          <div key={s.id} className={`suspect status-${status}`}>
            {s.mugshot_path && (
              <img src={`/uploads/${s.mugshot_path}`} alt={s.name} onClick={() => onView(s)} />
            )}
            <div className="name">{s.name}</div>
            <div className="status-btns">
              {OPTIONS.map((o) => (
                <button
                  key={o.key}
                  className={status === o.key ? o.cls : ""}
                  onClick={() => onStatus(s.id, status === o.key ? "unknown" : o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {isSearched ? (
              <div className="searched-tag">✓ Registrado</div>
            ) : (
              <button
                className="search-btn"
                disabled={searchBudget <= 0}
                title={
                  searchBudget <= 0
                    ? "No quedan órdenes de registro"
                    : "Gasta una orden de registro y revela su evidencia oculta"
                }
                onClick={() => {
                  if (
                    window.confirm(
                      `¿Solicitar orden de registro para ${s.name}?\n\nGastará 1 de ${searchBudget} órdenes del equipo. Úsenlas con cuidado.`
                    )
                  )
                    onSearch(s.id);
                }}
              >
                🔍 Solicitar registro
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
