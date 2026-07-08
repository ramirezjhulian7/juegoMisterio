import { db, initSchema } from "../db.js";
import { PANTALLA_NEGRA } from "./caso-pantalla-negra.js";
import { ensurePlaceholders } from "./placeholders.js";

// ---- Statements reutilizables (se inicializan tras initSchema) ----
let insCase: ReturnType<typeof db.prepare>;
let insEvidence: ReturnType<typeof db.prepare>;
let insObjective: ReturnType<typeof db.prepare>;
let insSuspect: ReturnType<typeof db.prepare>;
let insTimeline: ReturnType<typeof db.prepare>;
let insHint: ReturnType<typeof db.prepare>;

function prepareStatements(): void {
  insCase = db.prepare(
    `INSERT INTO cases (slug, case_number, title, objective, briefing, verify_url, cover_path)
     VALUES (@slug, @case_number, @title, @objective, @briefing, @verify_url, @cover_path)`
  );
  insEvidence = db.prepare(
    `INSERT INTO evidence (case_id, type, title, image_path, position, locked, suspect_id)
     VALUES (@case_id, @type, @title, @image_path, @position, @locked, @suspect_id)`
  );
  insObjective = db.prepare(
    `INSERT INTO objectives (case_id, prompt, answer, accepts, position)
     VALUES (@case_id, @prompt, @answer, @accepts, @position)`
  );
  insSuspect = db.prepare(
    `INSERT INTO suspects (case_id, name, mugshot_path, details)
     VALUES (@case_id, @name, @mugshot_path, @details)`
  );
  insTimeline = db.prepare(
    `INSERT INTO timeline_events (case_id, time_label, title, description, position)
     VALUES (@case_id, @time_label, @title, @description, @position)`
  );
  insHint = db.prepare(
    `INSERT INTO hints (case_id, text, position) VALUES (@case_id, @text, @position)`
  );
}

/** Carga el caso propio "Pantalla en Negro". */
function loadPantallaNegra(): void {
  const c = PANTALLA_NEGRA;
  const { lastInsertRowid } = insCase.run({
    slug: c.slug,
    case_number: c.case_number,
    title: c.title,
    objective: c.objective,
    briefing: c.briefing,
    verify_url: c.verify_url,
    cover_path: c.cover_path,
  });
  const caseId = Number(lastInsertRowid);

  // Sospechosos primero: necesitamos su id para vincular las evidencias de registro.
  const suspectIdByName = new Map<string, number>();
  for (const s of c.suspects) {
    const info = insSuspect.run({
      case_id: caseId,
      name: s.name,
      mugshot_path: `${c.slug}/${s.file}`,
      details: JSON.stringify(s.details),
    });
    suspectIdByName.set(s.name, Number(info.lastInsertRowid));
  }

  c.evidence.forEach((e, i) => {
    const lockedFor = "locked" in e ? (e as { locked?: string }).locked : undefined;
    insEvidence.run({
      case_id: caseId,
      type: e.type,
      title: e.title,
      image_path: `${c.slug}/${e.file}`,
      position: i,
      locked: lockedFor ? 1 : 0,
      suspect_id: lockedFor ? suspectIdByName.get(lockedFor) ?? null : null,
    });
  });

  c.objectives.forEach((o, i) => {
    insObjective.run({
      case_id: caseId,
      prompt: o.prompt,
      answer: o.answer,
      accepts: o.accepts || null,
      position: i,
    });
  });

  c.timeline.forEach((t, i) => {
    insTimeline.run({
      case_id: caseId,
      time_label: t.time,
      title: t.title,
      description: t.desc,
      position: i,
    });
  });

  c.hints.forEach((h, i) => {
    insHint.run({ case_id: caseId, text: h, position: i });
  });

  console.log(
    `[ok] ${c.slug}: ${c.evidence.length} evidencias, ${c.suspects.length} sospechosos, ` +
      `${c.objectives.length} objetivos, ${c.timeline.length} hitos, ${c.hints.length} pistas`
  );

  // Genera imagenes de marcador para lo que falte
  const files = [...c.evidence.map((e) => e.file), ...c.suspects.map((s) => s.file)];
  ensurePlaceholders(c.slug, files);
}

function run(): void {
  initSchema();
  prepareStatements();

  db.transaction(() => {
    // Reset del contenido (no toca partidas en curso)
    db.exec(
      "DELETE FROM hints; DELETE FROM timeline_events; DELETE FROM evidence; " +
        "DELETE FROM objectives; DELETE FROM suspects; DELETE FROM cases;"
    );
    loadPantallaNegra();
  })();

  console.log("[ok] Seed completado.");
}

run();
