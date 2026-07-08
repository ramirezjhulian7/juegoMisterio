import { useState } from "react";
import type { Objective } from "../types";
import { useLockCountdown } from "../useLockCountdown";

interface Props {
  objectives: Objective[];
  solved: boolean;
  verifyUrl: string | null;
  accusationLockUntil: string | null;
  onSubmit: (objectiveId: number, answer: string) => void;
}

export default function SolveBar({
  objectives,
  solved,
  verifyUrl,
  accusationLockUntil,
  onSubmit,
}: Props) {
  const [open, setOpen] = useState(false);
  const [objectiveId, setObjectiveId] = useState<number | null>(objectives[0]?.id ?? null);
  const [answer, setAnswer] = useState("");
  const lockLeft = useLockCountdown(accusationLockUntil);

  // El objetivo del culpable es el de menor posición (position 0 = primero).
  const accusationId = objectives.reduce(
    (min, o) => (o.position < (min?.position ?? Infinity) ? o : min),
    undefined as Objective | undefined
  )?.id;
  const isAccusation = objectiveId === accusationId;
  const blocked = isAccusation && lockLeft > 0;

  function submit() {
    if (objectiveId && answer.trim() && !blocked) {
      onSubmit(objectiveId, answer.trim());
      setAnswer("");
    }
  }

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (solved) return null;

  return (
    <div className="solvebar-float">
      {!open ? (
        <button className="primary" onClick={() => setOpen(true)}>
          🔎 Proponer solución
        </button>
      ) : (
        <div>
          <div className="field">
            <label>Objetivo</label>
            <select
              value={objectiveId ?? ""}
              onChange={(e) => setObjectiveId(Number(e.target.value))}
            >
              {objectives.map((o) => (
                <option key={o.id} value={o.id}>{o.prompt}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Tu respuesta</label>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Ej. nombre del culpable"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          {blocked && (
            <p style={{ fontSize: 12, color: "var(--danger)", margin: "0 0 8px" }}>
              ⛔ Acusación bloqueada por acusación fallida. Reintenten en {mmss(lockLeft)}.
            </p>
          )}
          <div className="row">
            <button className="primary" onClick={submit} disabled={blocked}>
              Enviar
            </button>
            <button onClick={() => setOpen(false)}>Cancelar</button>
          </div>
          {verifyUrl && (
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 0 }}>
              También pueden verificar la solución oficial en{" "}
              <a href={verifyUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                la web del caso
              </a>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
