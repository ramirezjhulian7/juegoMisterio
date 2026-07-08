import { useState } from "react";
import type { Note, Player } from "../types";

interface Props {
  notes: Note[];
  players: Player[];
  youId: number;
  onAdd: (text: string) => void;
  onDelete: (noteId: number) => void;
}

export default function Notes({ notes, players, youId, onAdd, onDelete }: Props) {
  const [text, setText] = useState("");

  function submit() {
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText("");
  }

  function author(playerId: number | null): Player | undefined {
    return players.find((p) => p.id === playerId);
  }

  return (
    <>
      <div>
        {notes.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            Aún no hay notas. Anoten pistas, contradicciones y teorías aquí.
          </p>
        )}
        {notes.map((n) => {
          const a = author(n.player_id);
          return (
            <div key={n.id} className="note" style={{ borderLeftColor: a?.color ?? "var(--accent)" }}>
              {n.player_id === youId && (
                <button className="del" onClick={() => onDelete(n.id)} title="Borrar">✕</button>
              )}
              <div className="who">{a?.name ?? "Alguien"}</div>
              <div className="txt">{n.text}</div>
            </div>
          );
        })}
      </div>

      <div className="note-form">
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          }}
          placeholder="Nueva nota… (Ctrl+Enter para enviar)"
        />
        <button className="primary" onClick={submit}>Añadir nota</button>
      </div>
    </>
  );
}
