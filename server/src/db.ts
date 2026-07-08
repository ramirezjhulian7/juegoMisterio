import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, "misterio.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/** Crea las tablas si no existen. Idempotente. */
export function initSchema(): void {
  db.exec(`
    -- ===== Contenido de los casos (se carga con el seed) =====
    CREATE TABLE IF NOT EXISTS cases (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      slug         TEXT UNIQUE NOT NULL,
      case_number  TEXT,
      title        TEXT NOT NULL,
      objective    TEXT NOT NULL,
      verify_url   TEXT,
      cover_path   TEXT
    );

    CREATE TABLE IF NOT EXISTS objectives (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id  INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      prompt   TEXT NOT NULL,
      answer   TEXT,                 -- solucion configurable (puede ser NULL = verificar en la web)
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id    INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      type       TEXT NOT NULL,      -- witness | suspect | letter | call | photo | article | other
      title      TEXT NOT NULL,
      image_path TEXT NOT NULL,
      position   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS suspects (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id      INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      mugshot_path TEXT,
      details      TEXT               -- JSON con datos de la ficha
    );

    -- ===== Partidas en tiempo real =====
    CREATE TABLE IF NOT EXISTS rooms (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      code        TEXT UNIQUE NOT NULL,
      case_id     INTEGER NOT NULL REFERENCES cases(id),
      host_name   TEXT,
      max_players INTEGER NOT NULL DEFAULT 15,
      solved      INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS players (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id   INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      name      TEXT NOT NULL,
      color     TEXT NOT NULL,
      online    INTEGER NOT NULL DEFAULT 1,
      joined_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id     INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      player_id   INTEGER REFERENCES players(id) ON DELETE SET NULL,
      evidence_id INTEGER REFERENCES evidence(id) ON DELETE SET NULL,
      suspect_id  INTEGER REFERENCES suspects(id) ON DELETE SET NULL,
      text        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Estado del tablero: veredicto compartido por sospechoso
    CREATE TABLE IF NOT EXISTS board_state (
      room_id    INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      suspect_id INTEGER NOT NULL REFERENCES suspects(id) ON DELETE CASCADE,
      status     TEXT NOT NULL DEFAULT 'unknown',  -- unknown | prime | maybe | cleared
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (room_id, suspect_id)
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id      INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      objective_id INTEGER NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
      player_id    INTEGER REFERENCES players(id) ON DELETE SET NULL,
      answer       TEXT NOT NULL,
      correct      INTEGER,           -- 1 | 0 | NULL (sin solucion configurada)
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
    CREATE INDEX IF NOT EXISTS idx_notes_room    ON notes(room_id);
    CREATE INDEX IF NOT EXISTS idx_players_room  ON players(room_id);
  `);
}
