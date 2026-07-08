import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import type {
  Note,
  Player,
  RoomState,
  SuspectStatus,
  Evidence,
  Deduction,
  Vote,
} from "../types";
import Briefing from "../components/Briefing";
import Cast from "../components/Cast";
import Viewer from "../components/Viewer";
import Suspects from "../components/Suspects";
import Notes from "../components/Notes";
import Gallery from "../components/Gallery";
import Timeline from "../components/Timeline";
import Hints from "../components/Hints";
import DeductionBoard from "../components/DeductionBoard";
import VoteBox from "../components/VoteBox";
import Icon from "../components/Icon";

type Tab = "sospechosos" | "evidencias" | "timeline" | "deduccion" | "votacion";

export default function Room() {
  const { code } = useParams();
  const nav = useNavigate();
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState<Tab>("sospechosos");
  const [viewer, setViewer] = useState<{ list: Evidence[]; index: number } | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  // Fase de introducción: briefing -> cast -> juego
  const [intro, setIntro] = useState<"briefing" | "cast" | "done">("briefing");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  function flash(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3800);
  }

  useEffect(() => {
    const name = localStorage.getItem("nombre") || "Detective";
    socket.connect();
    socket.emit("room:join", { code, name });

    socket.on("room:state", (s: RoomState) => setState(s));
    socket.on("players:update", (players: Player[]) =>
      setState((p) => (p ? { ...p, players } : p))
    );
    socket.on("note:added", (note: Note) =>
      setState((p) => (p ? { ...p, notes: [...p.notes, note] } : p))
    );
    socket.on("note:deleted", ({ noteId }: { noteId: number }) =>
      setState((p) => (p ? { ...p, notes: p.notes.filter((n) => n.id !== noteId) } : p))
    );
    socket.on(
      "board:updated",
      ({ suspectId, status }: { suspectId: number; status: SuspectStatus }) =>
        setState((p) => {
          if (!p) return p;
          const board = p.board.filter((b) => b.suspect_id !== suspectId);
          board.push({ suspect_id: suspectId, status });
          return { ...p, board };
        })
    );
    socket.on(
      "hints:unlocked",
      ({
        unlockedHints,
        hints,
        secondsToNextHint,
      }: {
        unlockedHints: number;
        hints: RoomState["hints"];
        secondsToNextHint: number | null;
      }) => {
        flash("💡 Se desbloqueó una nueva pista.");
        setState((p) => (p ? { ...p, unlockedHints, hints, secondsToNextHint } : p));
      }
    );
    socket.on(
      "search:done",
      ({
        by,
        suspectName,
        budgetLeft,
        evidence,
        searches,
      }: {
        by: string;
        suspectName: string;
        budgetLeft: number;
        evidence: Evidence[];
        searches: { suspect_id: number; player_id: number | null }[];
      }) => {
        flash(`🔍 ${by} ordenó registrar a ${suspectName}. Registros restantes: ${budgetLeft}.`);
        setState((p) =>
          p ? { ...p, evidence, searches, searchBudget: budgetLeft } : p
        );
      }
    );
    socket.on(
      "accusation:locked",
      ({ lockSeconds, until }: { lockSeconds: number; wrong: number; until: string | null }) => {
        flash(`⛔ Acusación incorrecta. Bloqueada ${lockSeconds}s: reúnan más pruebas.`);
        setState((p) => (p ? { ...p, accusationLockUntil: until } : p));
      }
    );
    socket.on("deduction:added", (d: Deduction) =>
      setState((p) =>
        p && !p.deductions.some((x) => x.id === d.id)
          ? { ...p, deductions: [...p.deductions, d] }
          : p
      )
    );
    socket.on("deduction:removed", ({ id }: { id: number }) =>
      setState((p) => (p ? { ...p, deductions: p.deductions.filter((d) => d.id !== id) } : p))
    );
    socket.on("votes:update", (votes: Vote[]) =>
      setState((p) => (p ? { ...p, votes } : p))
    );
    socket.on(
      "attempt:result",
      ({ correct, by, answer }: { correct: number | null; by: string; answer: string }) => {
        if (correct === 1) flash(`✅ ¡${by} acertó con "${answer}"!`);
        else if (correct === 0) flash(`❌ "${answer}" (por ${by}) no es correcto.`);
        else flash(`📤 ${by} propuso: "${answer}".`);
      }
    );
    socket.on("case:solved", () =>
      setState((p) => (p ? { ...p, room: { ...p.room, solved: 1 } } : p))
    );
    socket.on("error:msg", (m: string) => {
      // Si aún no hay estado, es un error de entrada (sala llena / inexistente).
      setState((p) => {
        if (!p) setError(m);
        return p;
      });
      flash("⚠️ " + m);
    });

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

  const statusOf = (id: number): SuspectStatus =>
    (state.board.find((b) => b.suspect_id === id)?.status ?? "unknown") as SuspectStatus;

  const TABS: { key: Tab; label: string }[] = [
    { key: "evidencias", label: "🗂️ Evidencias" },
    { key: "timeline", label: "🕒 Línea de tiempo" },
    { key: "deduccion", label: "🧩 Deducción" },
    { key: "votacion", label: "🗳️ Votación" },
  ];

  return (
    <div className="room">
      <div className="topbar">
        <span style={{ fontSize: 20 }}>🕵️</span>
        <div>
          <div style={{ fontWeight: 600 }}>{state.case.title}</div>
          <div className="obj">{state.case.objective}</div>
        </div>
        <div className="spacer" />
        {state.room.solved === 1 && <span className="solved-badge">CASO RESUELTO</span>}
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>CÓDIGO</div>
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

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20 }}>
          <h3 style={{ margin: 0 }}>Sospechosos</h3>
          <span className="budget-chip" title="Órdenes de registro disponibles para el equipo">
            🔍 {state.searchBudget}
          </span>
        </div>
        <Suspects
          suspects={state.suspects}
          statusOf={statusOf}
          searchedIds={state.searches.map((s) => s.suspect_id)}
          searchBudget={state.searchBudget}
          onView={(s) => {
            const idx = state.evidence.findIndex((e) => e.image_path === s.mugshot_path);
            if (idx >= 0) setViewer({ list: state.evidence, index: idx });
          }}
          onStatus={(id, status) => socket.emit("board:set", { suspectId: id, status })}
          onSearch={(id) => socket.emit("search:request", { suspectId: id })}
        />
      </div>

      {/* Centro: pestañas */}
      <div className="col center">
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "evidencias" && (
          <Gallery evidence={state.evidence} onOpen={(i) => setViewer({ list: state.evidence, index: i })} />
        )}
        {tab === "timeline" && <Timeline events={state.timeline} />}
        {tab === "deduccion" && (
          <DeductionBoard
            suspects={state.suspects}
            evidence={state.evidence}
            deductions={state.deductions}
            players={state.players}
            youId={state.you.id}
            onAdd={(suspectId, evidenceId, label) =>
              socket.emit("deduction:add", { suspectId, evidenceId, label })
            }
            onRemove={(id) => socket.emit("deduction:remove", { id })}
            onView={(i) => setViewer({ list: state.evidence, index: i })}
          />
        )}
        {tab === "votacion" && (
          <VoteBox
            suspects={state.suspects}
            votes={state.votes}
            players={state.players}
            youId={state.you.id}
            objectives={state.objectives}
            solved={state.room.solved === 1}
            accusationLockUntil={state.accusationLockUntil}
            onVote={(suspectId) => socket.emit("vote", { suspectId })}
            onSubmit={(objectiveId, answer) => socket.emit("attempt", { objectiveId, answer })}
          />
        )}
      </div>

      {/* Derecha: pistas + notas */}
      <div className="col right">
        <Hints
          hints={state.hints}
          unlockedHints={state.unlockedHints}
          secondsToNextHint={state.secondsToNextHint}
        />
        <h3 style={{ marginTop: 18 }}>Cuaderno del equipo</h3>
        <Notes
          notes={state.notes}
          players={state.players}
          youId={state.you.id}
          onAdd={(text) => socket.emit("note:add", { text })}
          onDelete={(noteId) => socket.emit("note:delete", { noteId })}
        />
      </div>

      {/* SolveBar flotante siempre visible salvo en votación (que ya lo incluye) */}
      {tab !== "votacion" && (
        <SolveBar
          objectives={state.objectives}
          solved={state.room.solved === 1}
          verifyUrl={state.case.verify_url}
          accusationLockUntil={state.accusationLockUntil}
          onSubmit={(objectiveId, answer) => socket.emit("attempt", { objectiveId, answer })}
        />
      )}

      {intro === "briefing" && state.case.briefing && (
        <Briefing
          title={state.case.title}
          caseNumber={state.case.case_number}
          briefing={state.case.briefing}
          onClose={() => setIntro(state.characters.length ? "cast" : "done")}
        />
      )}
      {intro === "cast" && (
        <Cast characters={state.characters} onClose={() => setIntro("done")} />
      )}

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
