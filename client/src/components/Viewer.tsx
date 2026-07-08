import { useEffect } from "react";
import type { Evidence } from "../types";
import Icon from "./Icon";

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
      <button className="close" aria-label="Cerrar" onClick={onClose}>
        <Icon name="close" size={26} />
      </button>
      {index > 0 && (
        <button className="nav prev" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); onIndex(index - 1); }}>
          <Icon name="chevron-left" size={32} />
        </button>
      )}
      <div onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
        <img src={`/uploads/${ev.image_path}`} alt={ev.title} />
        <div style={{ color: "#ccc", marginTop: 10, fontSize: 14 }}>
          {TYPE_LABEL[ev.type] ?? ev.type} · {index + 1} / {list.length}
        </div>
      </div>
      {index < list.length - 1 && (
        <button className="nav next" aria-label="Siguiente" onClick={(e) => { e.stopPropagation(); onIndex(index + 1); }}>
          <Icon name="chevron-right" size={32} />
        </button>
      )}
    </div>
  );
}
