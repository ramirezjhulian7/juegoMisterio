import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initSchema } from "./db.js";
import * as repo from "./repo.js";
import { registerSockets } from "./sockets.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;

initSchema();

const app = express();
app.use(cors());
app.use(express.json());

// Sirve las imagenes de evidencia
app.use("/uploads", express.static(join(__dirname, "..", "uploads")));

// ===== API REST (contenido y creacion/consulta de salas) =====
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/cases", (_req, res) => {
  res.json(repo.listCases());
});

app.get("/api/cases/:slug", (req, res) => {
  const c = repo.getCaseBySlug(req.params.slug);
  if (!c) return res.status(404).json({ error: "Caso no encontrado" });
  res.json({
    case: c,
    evidence: repo.getEvidence(c.id),
    suspects: repo.getSuspects(c.id),
    objectives: repo.getObjectives(c.id),
  });
});

// Crear sala
app.post("/api/rooms", (req, res) => {
  const { caseId, hostName } = req.body ?? {};
  if (!caseId || !repo.getCase(Number(caseId))) {
    return res.status(400).json({ error: "caseId invalido" });
  }
  const room = repo.createRoom(Number(caseId), String(hostName ?? "Anfitrion"));
  res.json({ room });
});

// Consultar sala por codigo (para validar antes de unirse)
app.get("/api/rooms/:code", (req, res) => {
  const room = repo.getRoomByCode(req.params.code);
  if (!room) return res.status(404).json({ error: "Sala no encontrada" });
  const c = repo.getCase(room.case_id)!;
  res.json({ room, case: c, players: repo.getPlayers(room.id) });
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
registerSockets(io);

httpServer.listen(PORT, () => {
  console.log(`\n🕵️  Servidor de misterios en http://localhost:${PORT}\n`);
});
