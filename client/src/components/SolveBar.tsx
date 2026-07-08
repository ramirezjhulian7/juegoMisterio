import { useState } from "react";
import type { Objective } from "../types";

interface Props {
  objectives: Objective[];
  solved: boolean;
  verifyUrl: string | null;
  onSubmit: (objectiveId: number, answer: string) => void;
}

export default function SolveBar({ objectives, solved, verifyUrl, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [objectiveId, setObjectiveId] = useState<number | null>(objectives[0]?.id ?? null);
  const [answer, setAnswer] = useState("");

  function submit() {
    if (objectiveId && answer.trim()) {
      onSubmit(objectiveId, answer.trim());
      setAnswer("");
    }
  }

  if (solved)
    return <div className="solve-banner ok">🎉 ¡Caso resuelto! Gran trabajo, equipo.</div>;

  return (
    <div className="card" style={{ marginBottom: 14 }}>
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
          <div className="row">
            <button className="primary" onClick={submit}>Enviar</button>
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
