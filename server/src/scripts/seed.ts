import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { db, initSchema } from "../db.js";
import type { EvidenceType } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(__dirname, "..", "..", "uploads", "manifest.json");

interface ManifestPage {
  index: number;
  image_path: string;
  type: EvidenceType;
  title: string;
  text: string;
}
interface ManifestCase {
  case_number: string;
  title: string;
  objective: string;
  verify_url: string;
  cover_path: string;
  pages: ManifestPage[];
}

function run(): void {
  initSchema();

  let manifest: Record<string, ManifestCase>;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch {
    console.error(
      "[!] No se encontro manifest.json. Ejecuta primero:\n" +
        "    python server/src/scripts/rasterize.py"
    );
    process.exit(1);
  }

  // Reset del contenido (no toca partidas)
  const reset = db.transaction(() => {
    db.exec("DELETE FROM evidence; DELETE FROM objectives; DELETE FROM suspects; DELETE FROM cases;");
  });
  reset();

  const insCase = db.prepare(
    `INSERT INTO cases (slug, case_number, title, objective, verify_url, cover_path)
     VALUES (@slug, @case_number, @title, @objective, @verify_url, @cover_path)`
  );
  const insEvidence = db.prepare(
    `INSERT INTO evidence (case_id, type, title, image_path, position)
     VALUES (@case_id, @type, @title, @image_path, @position)`
  );
  const insObjective = db.prepare(
    `INSERT INTO objectives (case_id, prompt, answer, position)
     VALUES (@case_id, @prompt, @answer, @position)`
  );
  const insSuspect = db.prepare(
    `INSERT INTO suspects (case_id, name, mugshot_path, details)
     VALUES (@case_id, @name, @mugshot_path, @details)`
  );

  const load = db.transaction(() => {
    for (const [slug, c] of Object.entries(manifest)) {
      const { lastInsertRowid } = insCase.run({
        slug,
        case_number: c.case_number,
        title: c.title,
        objective: c.objective,
        verify_url: c.verify_url,
        cover_path: c.cover_path,
      });
      const caseId = Number(lastInsertRowid);

      c.pages.forEach((p, i) => {
        insEvidence.run({
          case_id: caseId,
          type: p.type,
          title: p.title,
          image_path: p.image_path,
          position: i,
        });
      });

      // Objetivo principal del caso (los demas se pueden anadir a mano)
      insObjective.run({
        case_id: caseId,
        prompt: c.objective,
        answer: null,
        position: 0,
      });

      // Sospechosos: derivados de las paginas tipo "suspect"
      const suspects = c.pages.filter((p) => p.type === "suspect");
      for (const s of suspects) {
        insSuspect.run({
          case_id: caseId,
          name: s.title,
          mugshot_path: s.image_path,
          details: JSON.stringify({ source_page: s.index }),
        });
      }

      console.log(
        `[ok] ${slug}: ${c.pages.length} evidencias, ${suspects.length} sospechosos`
      );
    }
  });
  load();

  console.log("[ok] Seed completado.");
}

run();
