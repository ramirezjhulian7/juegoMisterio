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
/** Evidencia visible en una sala: las bloqueadas solo si su sospechoso fue registrado. */
export function getVisibleEvidence(caseId: number, roomId: number): Evidence[] {
  const searched = new Set(getSearches(roomId).map((s) => s.suspect_id));
  return getEvidence(caseId).filter(
    (e) => !e.locked || (e.suspect_id != null && searched.has(e.suspect_id))
  );
}
export function getSuspects(caseId: number): Suspect[] {
  return db.prepare("SELECT * FROM suspects WHERE case_id = ?").all(caseId) as Suspect[];
}
export function getObjectives(caseId: number) {
  return db
    .prepare("SELECT id, case_id, prompt, position FROM objectives WHERE case_id = ? ORDER BY position")
    .all(caseId);
}
export function getTimeline(caseId: number) {
  return db
    .prepare("SELECT * FROM timeline_events WHERE case_id = ? ORDER BY position")
    .all(caseId);
}
export function getHints(caseId: number) {
  return db.prepare("SELECT * FROM hints WHERE case_id = ? ORDER BY position").all(caseId);
}
export function getCharacters(caseId: number) {
  return db
    .prepare("SELECT * FROM characters WHERE case_id = ? ORDER BY position")
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
    .prepare("SELECT answer, accepts FROM objectives WHERE id = ?")
    .get(objectiveId) as { answer: string | null; accepts: string | null } | undefined;

  let correct: number | null = null;
  if (obj?.answer) {
    const valid = new Set(
      [obj.answer, ...(obj.accepts?.split("|") ?? [])].map((s) => normalize(s))
    );
    correct = valid.has(normalize(answer)) ? 1 : 0;
  }
  db.prepare(
    `INSERT INTO attempts (room_id, objective_id, player_id, answer, correct)
     VALUES (?, ?, ?, ?, ?)`
  ).run(roomId, objectiveId, playerId, answer, correct);
  return { correct };
}

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes
    .replace(/\s+/g, " ");
}

// ===== Pistas por tiempo =====
// Se desbloquea una pista cada HINT_INTERVAL_MS desde que se creó la sala.
export const HINT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Cuántas pistas están desbloqueadas en una sala según el tiempo transcurrido.
 * A los 0 min: 1 pista. A los 10: 2. A los 20: 3, etc. (tope = total de pistas)
 */
export function unlockedHintCount(room: Room, caseId: number): number {
  const total = (getHints(caseId) as unknown[]).length;
  const createdMs = Date.parse(room.created_at.replace(" ", "T") + "Z");
  const elapsed = Number.isNaN(createdMs) ? 0 : Date.now() - createdMs;
  const byTime = 1 + Math.floor(elapsed / HINT_INTERVAL_MS);
  return Math.max(0, Math.min(total, byTime));
}

/** Segundos hasta la próxima pista (null si ya están todas). */
export function secondsToNextHint(room: Room, caseId: number): number | null {
  const total = (getHints(caseId) as unknown[]).length;
  const unlocked = unlockedHintCount(room, caseId);
  if (unlocked >= total) return null;
  const createdMs = Date.parse(room.created_at.replace(" ", "T") + "Z");
  const elapsed = Number.isNaN(createdMs) ? 0 : Date.now() - createdMs;
  const nextAt = unlocked * HINT_INTERVAL_MS; // ms desde creación para la siguiente
  return Math.max(0, Math.ceil((nextAt - elapsed) / 1000));
}

// ===== Registros / cateos =====
export function getSearches(roomId: number): { suspect_id: number; player_id: number | null }[] {
  return db
    .prepare("SELECT suspect_id, player_id FROM searches WHERE room_id = ? ORDER BY created_at")
    .all(roomId) as { suspect_id: number; player_id: number | null }[];
}
/**
 * Intenta registrar a un sospechoso. Devuelve el resultado:
 *  - ok: se realizó (o ya estaba hecho)
 *  - reason "no_budget" | "invalid": no se pudo.
 * Consume 1 del presupuesto solo si es un sospechoso NUEVO.
 */
export function requestSearch(
  room: Room,
  suspectId: number,
  playerId: number | null
): { ok: boolean; reason?: string; budgetLeft: number } {
  const suspect = db
    .prepare("SELECT id FROM suspects WHERE id = ? AND case_id = ?")
    .get(suspectId, room.case_id);
  if (!suspect) return { ok: false, reason: "invalid", budgetLeft: room.search_budget };

  const already = db
    .prepare("SELECT 1 FROM searches WHERE room_id = ? AND suspect_id = ?")
    .get(room.id, suspectId);
  if (already) return { ok: true, budgetLeft: room.search_budget };

  if (room.search_budget <= 0)
    return { ok: false, reason: "no_budget", budgetLeft: 0 };

  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO searches (room_id, suspect_id, player_id) VALUES (?, ?, ?)"
    ).run(room.id, suspectId, playerId);
    db.prepare("UPDATE rooms SET search_budget = search_budget - 1 WHERE id = ?").run(room.id);
  });
  tx();
  return { ok: true, budgetLeft: room.search_budget - 1 };
}

// ===== Acusaciones (objetivo del culpable) =====
export const ACCUSATION_LOCK_MS = 5 * 60 * 1000; // 5 min de bloqueo tras fallar

/** ISO hasta cuándo la acusación está bloqueada, o null si está libre. */
export function accusationLockUntil(roomId: number): string | null {
  const r = db
    .prepare("SELECT accusation_lock_until FROM rooms WHERE id = ?")
    .get(roomId) as { accusation_lock_until: string | null } | undefined;
  if (!r?.accusation_lock_until) return null;
  const until = Date.parse(r.accusation_lock_until);
  return Number.isNaN(until) || until <= Date.now() ? null : r.accusation_lock_until;
}
/** Segundos restantes de bloqueo de acusación (0 si libre). */
export function accusationLockSeconds(roomId: number): number {
  const iso = accusationLockUntil(roomId);
  if (!iso) return 0;
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 1000));
}
/** Registra una acusación fallida: suma al contador y activa el bloqueo temporal. */
export function penalizeWrongAccusation(roomId: number): { lockSeconds: number; wrong: number } {
  const untilMs = Date.now() + ACCUSATION_LOCK_MS;
  const untilIso = new Date(untilMs).toISOString();
  db.prepare(
    "UPDATE rooms SET wrong_accusations = wrong_accusations + 1, accusation_lock_until = ? WHERE id = ?"
  ).run(untilIso, roomId);
  const r = db
    .prepare("SELECT wrong_accusations FROM rooms WHERE id = ?")
    .get(roomId) as { wrong_accusations: number };
  return { lockSeconds: Math.ceil(ACCUSATION_LOCK_MS / 1000), wrong: r.wrong_accusations };
}

// ===== Tablero de deduccion (hilos) =====
export function getDeductions(roomId: number) {
  return db
    .prepare("SELECT * FROM deductions WHERE room_id = ? ORDER BY created_at")
    .all(roomId);
}
export function addDeduction(
  roomId: number,
  suspectId: number,
  evidenceId: number,
  playerId: number | null,
  label: string | null
) {
  db.prepare(
    `INSERT OR IGNORE INTO deductions (room_id, suspect_id, evidence_id, player_id, label)
     VALUES (?, ?, ?, ?, ?)`
  ).run(roomId, suspectId, evidenceId, playerId, label);
  return db
    .prepare(
      "SELECT * FROM deductions WHERE room_id = ? AND suspect_id = ? AND evidence_id = ?"
    )
    .get(roomId, suspectId, evidenceId);
}
export function removeDeduction(id: number, roomId: number): void {
  db.prepare("DELETE FROM deductions WHERE id = ? AND room_id = ?").run(id, roomId);
}

// ===== Votacion =====
export function getVotes(roomId: number) {
  return db
    .prepare("SELECT room_id, player_id, suspect_id FROM votes WHERE room_id = ?")
    .all(roomId);
}
export function castVote(roomId: number, playerId: number, suspectId: number): void {
  db.prepare(
    `INSERT INTO votes (room_id, player_id, suspect_id, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(room_id, player_id)
     DO UPDATE SET suspect_id = excluded.suspect_id, updated_at = datetime('now')`
  ).run(roomId, playerId, suspectId);
}

/** Snapshot completo del estado de una sala para sincronizar al conectarse. */
export function getRoomState(room: Room) {
  const c = getCase(room.case_id)!;
  return {
    room,
    case: c,
    evidence: getVisibleEvidence(room.case_id, room.id),
    suspects: getSuspects(room.case_id),
    objectives: getObjectives(room.case_id),
    timeline: getTimeline(room.case_id),
    characters: getCharacters(room.case_id),
    hints: getHints(room.case_id).slice(0, unlockedHintCount(room, room.case_id)),
    players: getPlayers(room.id),
    notes: getNotes(room.id),
    board: getBoard(room.id),
    deductions: getDeductions(room.id),
    votes: getVotes(room.id),
    searches: getSearches(room.id),
    searchBudget: room.search_budget,
    unlockedHints: unlockedHintCount(room, room.case_id),
    secondsToNextHint: secondsToNextHint(room, room.case_id),
    accusationLockUntil: accusationLockUntil(room.id),
  };
}
