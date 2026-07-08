import type { Suspect, SuspectStatus } from "../types";

interface Props {
  suspects: Suspect[];
  statusOf: (suspectId: number) => SuspectStatus;
  onView: (s: Suspect) => void;
  onStatus: (suspectId: number, status: SuspectStatus) => void;
}

const OPTIONS: { key: SuspectStatus; label: string; cls: string }[] = [
  { key: "prime", label: "Principal", cls: "on-prime" },
  { key: "maybe", label: "Quizá", cls: "on-maybe" },
  { key: "cleared", label: "Descartado", cls: "on-cleared" },
];

export default function Suspects({ suspects, statusOf, onView, onStatus }: Props) {
  if (!suspects.length)
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>Este caso no tiene fichas de sospechosos detectadas.</p>;

  return (
    <>
      {suspects.map((s) => {
        const status = statusOf(s.id);
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
          </div>
        );
      })}
    </>
  );
}
