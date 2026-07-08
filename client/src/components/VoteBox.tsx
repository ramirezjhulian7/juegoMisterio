import { useState } from "react";
import type { Suspect, Vote, Player, Objective } from "../types";

interface Props {
  suspects: Suspect[];
  votes: Vote[];
  players: Player[];
  youId: number;
  objectives: Objective[];
  solved: boolean;
  onVote: (suspectId: number) => void;
  onSubmit: (objectiveId: number, answer: string) => void;
}

export default function VoteBox({
  suspects,
  votes,
  players,
  youId,
  objectives,
  solved,
  onVote,
  onSubmit,
}: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const myVote = votes.find((v) => v.player_id === youId)?.suspect_id;
  const online = players.filter((p) => p.online).length;

  const countFor = (id: number) => votes.filter((v) => v.suspect_id === id).length;
  const votersFor = (id: number) =>
    votes
      .filter((v) => v.suspect_id === id)
      .map((v) => players.find((p) => p.id === v.player_id)?.name ?? "?");

  // Prellena el objetivo 1 con el voto mayoritario si no se ha escrito
  const topSuspect = suspects
    .map((s) => ({ s, n: countFor(s.id) }))
    .sort((a, b) => b.n - a.n)[0];

  return (
    <div className="votebox">
      <h3>🗳️ ¿Quién creen que fue?</h3>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        {votes.length} de {online} detectives en línea han votado.
      </p>

      <div className="vote-grid">
        {suspects.map((s) => {
          const n = countFor(s.id);
          const mine = myVote === s.id;
          return (
            <div
              key={s.id}
              className={"vote-card" + (mine ? " mine" : "")}
              onClick={() => onVote(s.id)}
              title={votersFor(s.id).join(", ")}
            >
              {s.mugshot_path && <img src={`/uploads/${s.mugshot_path}`} alt={s.name} />}
              <div className="vote-name">{s.name}</div>
              <div className="vote-bar">
                <div className="vote-fill" style={{ width: `${votes.length ? (n / votes.length) * 100 : 0}%` }} />
              </div>
              <div className="vote-count">{n} voto{n === 1 ? "" : "s"}{mine ? " · tu voto" : ""}</div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Resolver el caso</h3>
        {solved ? (
          <div className="solve-banner ok" style={{ borderRadius: 8 }}>
            🎉 ¡Caso resuelto! Gran trabajo, equipo.
          </div>
        ) : (
          <>
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
              Cuando estén de acuerdo, respondan los objetivos. El acierto es del equipo.
            </p>
            {objectives.map((o, i) => (
              <div key={o.id} className="field">
                <label>{o.prompt}</label>
                <div className="row">
                  <input
                    style={{ flex: 1 }}
                    value={answers[o.id] ?? (i === 0 && topSuspect?.n ? topSuspect.s.name : "")}
                    onChange={(e) => setAnswers({ ...answers, [o.id]: e.target.value })}
                    placeholder="Tu respuesta"
                  />
                  <button
                    className="primary"
                    onClick={() => {
                      const a = answers[o.id] ?? (i === 0 && topSuspect?.n ? topSuspect.s.name : "");
                      if (a.trim()) onSubmit(o.id, a.trim());
                    }}
                  >
                    Enviar
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
