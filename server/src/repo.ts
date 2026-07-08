import { db } from "./db.js";
import { customAlphabet } from "nanoid";
import type { Case, Evidence, Suspect, Player, Note, Room } from "./types.js";

// Codigo de sala legible: sin caracteres ambiguos (0/O, 1/I)
const codeGen = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

const PLAYER_COLORS = [
  "#e6194B", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
  "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#fabed4",
  "#469990", "#dcbeff", "#9A6324", "#800000", "#000075",
];

// ===== Casos / contenido =====
export function listCases(): Case[] {
  return db.prepare("SELECT * FROM cases ORDER BY id").all() as Case[];
}
export function getCase(id: number): Case | undefined {
  return db.prepare("SELECT * FROM cases WHERE id = ?").get(id) as Case | undefined;
}
export function getCaseBySlug(slug: string): Case | undefined {
  return db.prepare("SELECT * FROM cases WHERE slug = ?").get(slug) as Case | undefined;
}
export function getEvidence(caseId: number): Evidence[] {
  return db
    .prepare("SELECT * FROM evidence WHERE case_id = ? ORDER BY position")
    .all(caseId) as Evidence[];
}
export function getSuspects(caseId: number): Suspect[] {
  return db.prepare("SELECT * FROM suspects WHERE case_id = ?").all(caseId) as Suspect[];
}
export function getObjectives(caseId: number) {
  return db
    .prepare("SELECT id, case_id, prompt, position FROM objectives WHERE case_id = ? ORDER BY position")
    .all(caseId);
}

// ===== Salas =====
export function createRoom(caseId: number, hostName: string, maxPlayers = 15): Room {
  let code = codeGen();
  // Evita colisiones (muy improbable, pero barato)
  while (db.prepare("SELECT 1 FROM rooms WHERE code = ?").get(code)) code = codeGen();

  const info = db
    .prepare(
      "INSERT INTO rooms (code, case_id, host_name, max_players) VALUES (?, ?, ?, ?)"
    )
    .run(code, caseId, hostName, maxPlayers);
  return getRoom(Number(info.lastInsertRowid))!;
}
export function getRoom(id: number): Room | undefined {
  return db.prepare("SELECT * FROM rooms WHERE id = ?").get(id) as Room | undefined;
}
export function getRoomByCode(code: string): Room | undefined {
  return db
    .prepare("SELECT * FROM rooms WHERE code = ?")
    .get(code.toUpperCase()) as Room | undefined;
}
export function markSolved(roomId: number): void {
  db.prepare("UPDATE rooms SET solved = 1 WHERE id = ?").run(roomId);
}

// ===== Jugadores =====
export function getPlayers(roomId: number): Player[] {
  return db
    .prepare("SELECT * FROM players WHERE room_id = ? ORDER BY joined_at")
    .all(roomId) as Player[];
}
export function addPlayer(roomId: number, name: string): Player {
  const existing = getPlayers(roomId);
  const color = PLAYER_COLORS[existing.length % PLAYER_COLORS.length];
  const info = db
    .prepare("INSERT INTO players (room_id, name, color, online) VALUES (?, ?, ?, 1)")
    .run(roomId, name, color);
  return db.prepare("SELECT * FROM players WHERE id = ?").get(info.lastInsertRowid) as Player;
}
export function getPlayer(id: number): Player | undefined {
  return db.prepare("SELECT * FROM players WHERE id = ?").get(id) as Player | undefined;
}
export function setPlayerOnline(id: number, online: boolean): void {
  db.prepare("UPDATE players SET online = ? WHERE id = ?").run(online ? 1 : 0, id);
}

// ===== Notas =====
export function getNotes(roomId: number): Note[] {
  return db
    .prepare("SELECT * FROM notes WHERE room_id = ? ORDER BY created_at")
    .all(roomId) as Note[];
}
export function addNote(
  roomId: number,
  playerId: number | null,
  text: string,
  evidenceId: number | null,
  suspectId: number | null
): Note {
  const info = db
    .prepare(
      `INSERT INTO notes (room_id, player_id, evidence_id, suspect_id, text)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(roomId, playerId, evidenceId, suspectId, text);
  return db.prepare("SELECT * FROM notes WHERE id = ?").get(info.lastInsertRowid) as Note;
}
export function deleteNote(id: number, roomId: number): void {
  db.prepare("DELETE FROM notes WHERE id = ? AND room_id = ?").run(id, roomId);
}

// ===== Tablero (veredicto por sospechoso) =====
export function getBoard(roomId: number): { suspect_id: number; status: string }[] {
  return db
    .prepare("SELECT suspect_id, status FROM board_state WHERE room_id = ?")
    .all(roomId) as { suspect_id: number; status: string }[];
}
export function setBoardStatus(roomId: number, suspectId: number, status: string): void {
  db.prepare(
    `INSERT INTO board_state (room_id, suspect_id, status, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(room_id, suspect_id)
     DO UPDATE SET status = excluded.status, updated_at = datetime('now')`
  ).run(roomId, suspectId, status);
}

// ===== Intentos de solucion =====
export function recordAttempt(
  roomId: number,
  objectiveId: number,
  playerId: number | null,
  answer: string
): { correct: number | null } {
  const obj = db
    .prepare("SELECT answer FROM objectives WHERE id = ?")
    .get(objectiveId) as { answer: string | null } | undefined;

  let correct: number | null = null;
  if (obj?.answer) {
    correct = normalize(obj.answer) === normalize(answer) ? 1 : 0;
  }
  db.prepare(
    `INSERT INTO attempts (room_id, objective_id, player_id, answer, correct)
     VALUES (?, ?, ?, ?, ?)`
  ).run(roomId, objectiveId, playerId, answer, correct);
  return { correct };
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Snapshot completo del estado de una sala para sincronizar al conectarse. */
export function getRoomState(room: Room) {
  const c = getCase(room.case_id)!;
  return {
    room,
    case: c,
    evidence: getEvidence(room.case_id),
    suspects: getSuspects(room.case_id),
    objectives: getObjectives(room.case_id),
    players: getPlayers(room.id),
    notes: getNotes(room.id),
    board: getBoard(room.id),
  };
}
