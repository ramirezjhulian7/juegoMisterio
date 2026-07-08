import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, "..", "..", "uploads");

/**
 * Para cada archivo esperado que no exista aún, genera un PNG de marcador de
 * posición con su título. Así la app funciona antes de tener las imágenes
 * definitivas; basta con reemplazar el archivo (mismo nombre) y recargar.
 */
export function ensurePlaceholders(slug: string, files: string[]): void {
  const dir = join(uploadsDir, slug);
  mkdirSync(dir, { recursive: true });

  const missing = files.filter((f) => {
    const png = join(dir, f);
    const jpg = png.replace(/\.png$/i, ".jpg");
    return !existsSync(png) && !existsSync(jpg);
  });

  if (missing.length === 0) {
    console.log(`[i] ${slug}: todas las imágenes presentes, sin placeholders.`);
    return;
  }

  // Escribe un pequeño script Python temporal y lo ejecuta con PyMuPDF.
  const py = `
import fitz, sys, os, json
dir = ${JSON.stringify(dir)}
files = json.loads(${JSON.stringify(JSON.stringify(missing))})
W, H = 800, 1035
for f in files:
    title = os.path.splitext(f)[0].replace('-', ' ').replace('_', ' ').upper()
    doc = fitz.open()
    page = doc.new_page(width=W, height=H)
    page.draw_rect(fitz.Rect(0,0,W,H), color=(0.09,0.07,0.05), fill=(0.09,0.07,0.05))
    page.draw_rect(fitz.Rect(30,30,W-30,H-30), color=(0.79,0.63,0.29), width=2)
    page.insert_text((60, 120), "EVIDENCIA PENDIENTE", fontsize=20, color=(0.79,0.63,0.29))
    # titulo (envuelto)
    rect = fitz.Rect(60, 160, W-60, 420)
    page.insert_textbox(rect, title, fontsize=34, color=(0.91,0.89,0.82), fontname="helv")
    page.insert_text((60, H-90), "Reemplaza este archivo:", fontsize=13, color=(0.6,0.56,0.48))
    page.insert_text((60, H-65), "uploads/"+os.path.basename(dir)+"/"+f, fontsize=13, color=(0.79,0.63,0.29))
    pix = page.get_pixmap(dpi=96)
    pix.save(os.path.join(dir, f))
print("placeholders:", len(files))
`;
  const tmp = join(dir, "_placeholder.py");
  writeFileSync(tmp, py, "utf-8");
  try {
    const out = execFileSync("python", [tmp], { encoding: "utf-8" });
    console.log(`[ok] ${slug}: ${out.trim()}`);
  } catch (e) {
    console.warn(
      `[!] No se pudieron generar placeholders (¿Python/PyMuPDF?). ` +
        `Las imágenes faltantes se verán rotas hasta que las agregues. ${(e as Error).message}`
    );
  }
}
