import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Case } from "../types";

export default function Home() {
  const nav = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [name, setName] = useState(localStorage.getItem("nombre") ?? "");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((data: Case[]) => {
        setCases(data);
        if (data.length) setSelected(data[0].id);
      })
      .catch(() => setError("No se pudo conectar con el servidor."));
  }, []);

  function saveName() {
    localStorage.setItem("nombre", name.trim());
  }

  async function createRoom() {
    if (!name.trim()) return setError("Escribe tu nombre.");
    if (!selected) return setError("Elige un caso.");
    saveName();
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: selected, hostName: name.trim() }),
    });
    const data = await res.json();
    if (data.room) nav(`/sala/${data.room.code}`);
    else setError(data.error ?? "Error al crear la sala.");
  }

  async function joinRoom() {
    if (!name.trim()) return setError("Escribe tu nombre.");
    const code = joinCode.trim().toUpperCase();
    if (!code) return setError("Escribe el codigo de la sala.");
    saveName();
    const res = await fetch(`/api/rooms/${code}`);
    if (res.ok) nav(`/sala/${code}`);
    else setError("Sala no encontrada.");
  }

  return (
    <div className="home">
      <h1>Expedientes sin Resolver</h1>
      <p className="sub">Resuelvan el misterio juntos, en tiempo real.</p>

      <div className="field" style={{ maxWidth: 320 }}>
        <label>Tu nombre de detective</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Sherlock" />
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="home-cols">
        <div className="card">
          <h2>Crear una partida nueva</h2>
          <div className="case-list">
            {cases.map((c) => (
              <div
                key={c.id}
                className={"case-item" + (selected === c.id ? " selected" : "")}
                onClick={() => setSelected(c.id)}
              >
                {c.cover_path && <img src={`/uploads/${c.cover_path}`} alt="" />}
                <div>
                  <div className="t">{c.title}</div>
                  <div className="n">Caso Nº {c.case_number}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="primary" style={{ marginTop: 14, width: "100%" }} onClick={createRoom}>
            Crear sala
          </button>
        </div>

        <div className="card">
          <h2>Unirme a una partida</h2>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            Pide el codigo de sala a quien la creo.
          </p>
          <div className="field">
            <label>Codigo de sala</label>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Ej. K3F9Z"
              maxLength={5}
              style={{ fontFamily: "monospace", fontSize: 20, letterSpacing: 3 }}
            />
          </div>
          <button className="primary" style={{ width: "100%" }} onClick={joinRoom}>
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
}
