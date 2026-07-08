import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import type { Note, Player, RoomState, SuspectStatus, Evidence } from "../types";
import Viewer from "../components/Viewer";
import Suspects from "../components/Suspects";
import Notes from "../components/Notes";
import Gallery from "../components/Gallery";
import SolveBar from "../components/SolveBar";

export default function Room() {
  const { code } = useParams();
  const nav = useNavigate();
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [viewer, setViewer] = useState<{ list: Evidence[]; index: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  function flash(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  }

  useEffect(() => {
    const name = localStorage.getItem("nombre") || "Detective";
    socket.connect();
    socket.emit("room:join", { code, name });

    socket.on("room:state", (s: RoomState) => setState(s));
    socket.on("players:update", (players: Player[]) =>
      setState((prev) => (prev ? { ...prev, players } : prev))
    );
    socket.on("note:added", (note: Note) =>
      setState((prev) => (prev ? { ...prev, notes: [...prev.notes, note] } : prev))
    );
    socket.on("note:deleted", ({ noteId }: { noteId: number }) =>
      setState((prev) =>
        prev ? { ...prev, notes: prev.notes.filter((n) => n.id !== noteId) } : prev
      )
    );
    socket.on(
      "board:updated",
      ({ suspectId, status }: { suspectId: number; status: SuspectStatus }) =>
        setState((prev) => {
          if (!prev) return prev;
          const board = prev.board.filter((b) => b.suspect_id !== suspectId);
          board.push({ suspect_id: suspectId, status });
          return { ...prev, board };
        })
    );
    socket.on(
      "attempt:result",
      ({ correct, by, answer }: { correct: number | null; by: string; answer: string }) => {
        if (correct === 1) {
          flash(`✅ ¡${by} resolvió el caso con "${answer}"!`);
          setState((prev) => (prev ? { ...prev, room: { ...prev.room, solved: 1 } } : prev));
        } else if (correct === 0) {
          flash(`❌ "${answer}" (por ${by}) no es correcto.`);
        } else {
          flash(`📤 ${by} propuso: "${answer}". Verifiquen en la web oficial.`);
        }
      }
    );
    socket.on("error:msg", (m: string) => setError(m));

    return () => {
      socket.off();
      socket.disconnect();
    };
  }, [code]);

  if (error)
    return (
      <div className="home">
        <p style={{ color: "var(--danger)" }}>{error}</p>
        <button onClick={() => nav("/")}>Volver al inicio</button>
      </div>
    );
  if (!state) return <div className="home">Conectando a la sala…</div>;

  const statusOf = (suspectId: number): SuspectStatus =>
    (state.board.find((b) => b.suspect_id === suspectId)?.status ?? "unknown") as SuspectStatus;

  return (
    <div className="room">
      <div className="topbar">
        <span>🕵️</span>
        <div>
          <div style={{ fontWeight: 600 }}>{state.case.title}</div>
          <div className="obj">{state.case.objective}</div>
        </div>
        <div className="spacer" />
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>CÓDIGO DE SALA</div>
          <div className="code">{state.room.code}</div>
        </div>
        <button onClick={() => { navigator.clipboard?.writeText(state.room.code); flash("Código copiado"); }}>
          Copiar
        </button>
        <button onClick={() => nav("/")}>Salir</button>
      </div>

      {/* Izquierda: jugadores + sospechosos */}
      <div className="col left">
        <h3>Detectives ({state.players.filter((p) => p.online).length} en línea)</h3>
        {state.players.map((p) => (
          <div key={p.id} className={"player-chip" + (p.online ? "" : " offline")}>
            <span className="dot" style={{ background: p.color }} />
            <span>{p.name}{p.id === state.you.id ? " (tú)" : ""}</span>
          </div>
        ))}

        <h3 style={{ marginTop: 20 }}>Sospechosos</h3>
        <Suspects
          suspects={state.suspects}
          statusOf={statusOf}
          onView={(s) => {
            const idx = state.evidence.findIndex((e) => e.image_path === s.mugshot_path);
            if (idx >= 0) setViewer({ list: state.evidence, index: idx });
          }}
          onStatus={(suspectId, status) => socket.emit("board:set", { suspectId, status })}
        />
      </div>

      {/* Centro: evidencias */}
      <div className="col center">
        <SolveBar
          objectives={state.objectives}
          solved={state.room.solved === 1}
          verifyUrl={state.case.verify_url}
          onSubmit={(objectiveId, answer) => socket.emit("attempt", { objectiveId, answer })}
        />
        <Gallery
          evidence={state.evidence}
          onOpen={(index) => setViewer({ list: state.evidence, index })}
        />
      </div>

      {/* Derecha: notas compartidas */}
      <div className="col right">
        <h3>Cuaderno del equipo</h3>
        <Notes
          notes={state.notes}
          players={state.players}
          youId={state.you.id}
          onAdd={(text) => socket.emit("note:add", { text })}
          onDelete={(noteId) => socket.emit("note:delete", { noteId })}
        />
      </div>

      {viewer && (
        <Viewer
          list={viewer.list}
          index={viewer.index}
          onIndex={(i) => setViewer({ ...viewer, index: i })}
          onClose={() => setViewer(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
