"""Rasteriza los PDFs de casos a imagenes PNG y genera un manifest.json.

Uso:  python rasterize.py
Salida: server/uploads/<slug>/page-N.png  +  server/uploads/manifest.json

No requiere poppler; usa PyMuPDF (fitz).
"""
import json
import os
import re

import fitz  # PyMuPDF

HERE = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.abspath(os.path.join(HERE, "..", ".."))
REPO_DIR = os.path.abspath(os.path.join(SERVER_DIR, ".."))
PDF_DIR = os.path.join(REPO_DIR, "PDF")
OUT_DIR = os.path.join(SERVER_DIR, "uploads")

DPI = 150

# slug -> (archivo pdf, numero de caso, titulo, objetivo, url de verificacion)
CASES = {
    "fox": (
        "unsolved-case-files-fox.pdf",
        "002-11232000",
        "Quien mato a Catherine Fox",
        "Prueba quien mato a Catherine Fox.",
        "https://www.unsolvedcasefiles.com/catherine-1",
    ),
    "jack": (
        "unsolved-case-files-who-whacked-jack.pdf",
        "003-07222000",
        "Quien liquido a Jack",
        "Averigua quien mato a Jack Lumberski.",
        "https://www.unsolvedcasefiles.com/jack-1",
    ),
    "madeline": (
        "free-unsolved-case-file-madeline-deparde-01.pdf",
        "001",
        "El caso de Madeline Deparde",
        "Resuelve el caso de Madeline Deparde.",
        "https://www.unsolvedcasefiles.com",
    ),
}


def infer_type(text: str) -> str:
    t = text.lower()
    if "911" in t or "dispatcher" in t or "transcript" in t:
        return "call"
    if "witness statement" in t:
        return "witness"
    if "person of interest" in t or "date of birth" in t:
        return "suspect"
    if "dear " in t or "yours truly" in t or "sincerely" in t:
        return "letter"
    if "what is unsolved case files" in t or "your objective" in t:
        return "intro"
    if "news" in t or "times" in t or "herald" in t:
        return "article"
    return "other"


def make_title(text: str, page_num: int) -> str:
    for line in text.splitlines():
        line = line.strip()
        # primera linea con contenido razonable
        if len(line) >= 4 and re.search(r"[A-Za-z]", line):
            return (line[:60]).strip()
    return f"Pagina {page_num + 1}"


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    manifest = {}

    for slug, (pdf_name, number, title, objective, url) in CASES.items():
        pdf_path = os.path.join(PDF_DIR, pdf_name)
        if not os.path.exists(pdf_path):
            print(f"[!] No encontrado: {pdf_path}")
            continue

        case_out = os.path.join(OUT_DIR, slug)
        os.makedirs(case_out, exist_ok=True)

        doc = fitz.open(pdf_path)
        pages = []
        for i in range(doc.page_count):
            page = doc.load_page(i)
            pix = page.get_pixmap(dpi=DPI)
            fname = f"page-{i + 1}.png"
            pix.save(os.path.join(case_out, fname))
            text = page.get_text().strip()
            pages.append(
                {
                    "index": i,
                    "image_path": f"{slug}/{fname}",
                    "type": infer_type(text),
                    "title": make_title(text, i),
                    "text": text,
                }
            )
        manifest[slug] = {
            "case_number": number,
            "title": title,
            "objective": objective,
            "verify_url": url,
            "cover_path": f"{slug}/page-1.png",
            "pages": pages,
        }
        print(f"[ok] {slug}: {doc.page_count} paginas rasterizadas")
        doc.close()

    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"[ok] manifest.json escrito en {OUT_DIR}")


if __name__ == "__main__":
    main()
