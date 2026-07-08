import { useEffect } from "react";
import type { Evidence } from "../types";

interface Props {
  list: Evidence[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  intro: "Introducción",
  witness: "Declaración de testigo",
  suspect: "Ficha de sospechoso",
  letter: "Carta",
  call: "Llamada / transcripción",
  photo: "Fotografía",
  article: "Recorte de prensa",
  other: "Documento",
};

export default function Viewer({ list, index, onIndex, onClose }: Props) {
  const ev = list[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < list.length - 1) onIndex(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, list.length, onClose, onIndex]);

  if (!ev) return null;

  return (
    <div className="viewer" onClick={onClose}>
      <button className="close" onClick={onClose}>✕</button>
      {index > 0 && (
        <button className="nav prev" onClick={(e) => { e.stopPropagation(); onIndex(index - 1); }}>‹</button>
      )}
      <div onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
        <img src={`/uploads/${ev.image_path}`} alt={ev.title} />
        <div style={{ color: "#ccc", marginTop: 10, fontSize: 13 }}>
          {TYPE_LABEL[ev.type] ?? ev.type} · {index + 1} / {list.length}
        </div>
      </div>
      {index < list.length - 1 && (
        <button className="nav next" onClick={(e) => { e.stopPropagation(); onIndex(index + 1); }}>›</button>
      )}
    </div>
  );
}
