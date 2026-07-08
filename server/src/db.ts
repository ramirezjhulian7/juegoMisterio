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
      briefing     TEXT,
      verify_url   TEXT,
      cover_path   TEXT
    );

    CREATE TABLE IF NOT EXISTS objectives (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id  INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      prompt   TEXT NOT NULL,
      answer   TEXT,                 -- solucion canonica (NULL = verificar en la web)
      accepts  TEXT,                 -- alternativas aceptadas, separadas por '|'
      position INTEGER NOT NULL DEFAULT 0
    );

    -- Linea de tiempo fija del caso (los hechos conocidos)
    CREATE TABLE IF NOT EXISTS timeline_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      time_label  TEXT NOT NULL,      -- "10:41 p.m."
      title       TEXT NOT NULL,
      description TEXT,
      position    INTEGER NOT NULL DEFAULT 0
    );

    -- Pistas (hints) que el equipo puede revelar en orden
    CREATE TABLE IF NOT EXISTS hints (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id  INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      text     TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id    INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      type       TEXT NOT NULL,      -- witness | suspect | letter | call | photo | article | other
      title      TEXT NOT NULL,
      image_path TEXT NOT NULL,
      position   INTEGER NOT NULL DEFAULT 0,
      locked     INTEGER NOT NULL DEFAULT 0,          -- 1 = oculta hasta registrar al sospechoso
      suspect_id INTEGER REFERENCES suspects(id) ON DELETE SET NULL  -- a quién pertenece (para el registro)
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
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      code          TEXT UNIQUE NOT NULL,
      case_id       INTEGER NOT NULL REFERENCES cases(id),
      host_name     TEXT,
      max_players   INTEGER NOT NULL DEFAULT 15,
      search_budget INTEGER NOT NULL DEFAULT 2,   -- órdenes de registro disponibles para el equipo
      solved        INTEGER NOT NULL DEFAULT 0,
      wrong_accusations INTEGER NOT NULL DEFAULT 0,  -- acusaciones falladas (para el marcador)
      accusation_lock_until TEXT,                    -- ISO: hasta cuándo no se puede volver a acusar
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
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

    -- Sospechosos ya registrados (orden de registro) en una sala
    CREATE TABLE IF NOT EXISTS searches (
      room_id    INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      suspect_id INTEGER NOT NULL REFERENCES suspects(id) ON DELETE CASCADE,
      player_id  INTEGER REFERENCES players(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (room_id, suspect_id)
    );

    -- Pistas ya reveladas en una sala (compartidas por el equipo)
    CREATE TABLE IF NOT EXISTS revealed_hints (
      room_id     INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      hint_id     INTEGER NOT NULL REFERENCES hints(id) ON DELETE CASCADE,
      revealed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (room_id, hint_id)
    );

    -- Tablero de deduccion: hilos que conectan un sospechoso con una evidencia
    CREATE TABLE IF NOT EXISTS deductions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id     INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      suspect_id  INTEGER NOT NULL REFERENCES suspects(id) ON DELETE CASCADE,
      evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
      player_id   INTEGER REFERENCES players(id) ON DELETE SET NULL,
      label       TEXT,               -- por que conecta (opcional)
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (room_id, suspect_id, evidence_id)
    );

    -- Votacion final: cada jugador vota a un sospechoso como culpable
    CREATE TABLE IF NOT EXISTS votes (
      room_id    INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      player_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      suspect_id INTEGER NOT NULL REFERENCES suspects(id) ON DELETE CASCADE,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (room_id, player_id)
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
