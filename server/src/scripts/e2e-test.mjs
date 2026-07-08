// Prueba end-to-end: crea una sala y conecta 2 jugadores por socket.
import { io } from "socket.io-client";

const BASE = "http://localhost:4000";

function connect(name) {
  return io(BASE, { transports: ["websocket"], forceNew: true });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // 1) crear sala
  const res = await fetch(`${BASE}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId: 1, hostName: "Ana" }),
  });
  const { room } = await res.json();
  console.log("Sala creada:", room.code);

  const a = connect("Ana");
  const b = connect("Beto");
  let bGotNote = false;
  let bGotBoard = false;
  let aState = null;

  a.on("room:state", (s) => { aState = s; });
  b.on("note:added", (n) => { if (n.text.includes("pista")) bGotNote = true; });
  b.on("board:updated", (e) => { if (e.status === "prime") bGotBoard = true; });

  a.emit("room:join", { code: room.code, name: "Ana" });
  await wait(300);
  b.emit("room:join", { code: room.code, name: "Beto" });
  await wait(300);

  console.log("Sospechosos en la sala:", aState?.suspects?.length);
  console.log("Evidencias en la sala:", aState?.evidence?.length);
  console.log("Jugadores:", aState?.players?.map((p) => p.name).join(", "));

  // 2) Ana crea una nota -> Beto debe recibirla
  a.emit("note:add", { text: "primera pista importante" });
  // 3) Ana marca un sospechoso como principal -> Beto debe recibirlo
  const suspectId = aState.suspects[0].id;
  a.emit("board:set", { suspectId, status: "prime" });
  await wait(400);

  console.log("Beto recibió la nota en tiempo real:", bGotNote);
  console.log("Beto recibió el cambio de tablero:", bGotBoard);

  // 4) Verificar persistencia: reconsultar estado por REST
  const check = await fetch(`${BASE}/api/rooms/${room.code}`).then((r) => r.json());
  console.log("Sala persistida con jugadores:", check.players.length);

  a.close();
  b.close();

  const ok = bGotNote && bGotBoard && aState.suspects.length === 3;
  console.log(ok ? "\n✅ E2E OK" : "\n❌ E2E FALLÓ");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
