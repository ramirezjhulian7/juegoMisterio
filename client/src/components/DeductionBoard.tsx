import { useState } from "react";
import type { Suspect, Evidence, Deduction, Player } from "../types";
import Icon from "./Icon";

interface Props {
  suspects: Suspect[];
  evidence: Evidence[];
  deductions: Deduction[];
  players: Player[];
  youId: number;
  onAdd: (suspectId: number, evidenceId: number, label: string | null) => void;
  onRemove: (id: number) => void;
  onView: (evidenceIndex: number) => void;
}

export default function DeductionBoard({
  suspects,
  evidence,
  deductions,
  players,
  youId,
  onAdd,
  onRemove,
  onView,
}: Props) {
  const [suspectId, setSuspectId] = useState<number | null>(suspects[0]?.id ?? null);
  const [evidenceId, setEvidenceId] = useState<number | null>(null);
  const [label, setLabel] = useState("");

  function connect() {
    if (suspectId && evidenceId) {
      onAdd(suspectId, evidenceId, label.trim() || null);
      setLabel("");
      setEvidenceId(null);
    }
  }

  const evName = (id: number) => evidence.find((e) => e.id === id)?.title ?? "?";
  const evIndex = (id: number) => evidence.findIndex((e) => e.id === id);
  const author = (pid: number | null) => players.find((p) => p.id === pid)?.name ?? "?";

  return (
    <div className="deduction">
      <p className="deduction-help">
        Conecten pistas con sospechosos para construir su teoría. Todo el equipo ve los hilos.
      </p>

      <div className="deduction-form card">
        <div className="field">
          <label>Sospechoso</label>
          <select value={suspectId ?? ""} onChange={(e) => setSuspectId(Number(e.target.value))}>
            {suspects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Evidencia</label>
          <select value={evidenceId ?? ""} onChange={(e) => setEvidenceId(Number(e.target.value))}>
            <option value="">— elige —</option>
            {evidence.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>¿Por qué conecta? (opcional)</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej. contradice su coartada" />
        </div>
        <button
          className="primary"
          style={{ width: "100%", minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onClick={connect}
          disabled={!suspectId || !evidenceId}
        >
          <Icon name="puzzle" size={16} /> Conectar
        </button>
      </div>

      <div className="deduction-grid">
        {suspects.map((s) => {
          const links = deductions.filter((d) => d.suspect_id === s.id);
          return (
            <div key={s.id} className="deduction-col">
              <div className="deduction-suspect">
                {s.mugshot_path && <img src={`/uploads/${s.mugshot_path}`} alt={s.name} />}
                <span>{s.name}</span>
                <span className="link-count">{links.length}</span>
              </div>
              {links.length === 0 && <div className="deduction-empty">Sin conexiones</div>}
              {links.map((d) => (
                <div key={d.id} className="deduction-link">
                  <div className="dl-ev" onClick={() => onView(evIndex(d.evidence_id))}>
                    {evName(d.evidence_id)}
                  </div>
                  {d.label && <div className="dl-label">“{d.label}”</div>}
                  <div className="dl-meta">
                    por {author(d.player_id)}
                    {d.player_id === youId && (
                      <button className="dl-del" onClick={() => onRemove(d.id)}>quitar</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
