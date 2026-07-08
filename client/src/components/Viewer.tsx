import { useEffect, useRef, useState } from "react";
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

const MAX_SCALE = 5;
const MIN_SCALE = 1;

export default function Viewer({ list, index, onIndex, onClose }: Props) {
  const ev = list[index];

  // Estado de zoom/pan
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const zoomed = scale > 1;

  // Gestos táctiles: rastreo de punteros activos
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lastTap = useRef(0);

  // Reinicia el zoom al cambiar de imagen
  useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, [index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0 && !zoomed) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < list.length - 1 && !zoomed) onIndex(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, list.length, onClose, onIndex, zoomed]);

  if (!ev) return null;

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      pinchStart.current = { dist: dist(pts[0], pts[1]), scale };
      panStart.current = null;
    } else if (pts.length === 1 && zoomed) {
      panStart.current = { x: e.clientX, y: e.clientY, tx, ty };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];

    if (pts.length === 2 && pinchStart.current) {
      const d = dist(pts[0], pts[1]);
      const next = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, (d / pinchStart.current.dist) * pinchStart.current.scale)
      );
      setScale(next);
      if (next === 1) {
        setTx(0);
        setTy(0);
      }
    } else if (pts.length === 1 && panStart.current && zoomed) {
      setTx(panStart.current.tx + (e.clientX - panStart.current.x));
      setTy(panStart.current.ty + (e.clientY - panStart.current.y));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) panStart.current = null;
  }

  // Doble tap / doble clic: alterna zoom
  function onDoubleActivate() {
    if (zoomed) {
      setScale(1);
      setTx(0);
      setTy(0);
    } else {
      setScale(2.5);
    }
  }
  function onImgPointerUp(e: React.PointerEvent) {
    onPointerUp(e);
    const now = e.timeStamp;
    if (now - lastTap.current < 300) onDoubleActivate();
    lastTap.current = now;
  }

  // Rueda del ratón (desktop): zoom
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale - e.deltaY * 0.002));
    setScale(next);
    if (next === 1) {
      setTx(0);
      setTy(0);
    }
  }

  return (
    <div className="viewer" onClick={() => !zoomed && onClose()}>
      <button className="close" aria-label="Cerrar" onClick={onClose}>
        <Icon name="close" size={26} />
      </button>
      {index > 0 && !zoomed && (
        <button className="nav prev" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); onIndex(index - 1); }}>
          <Icon name="chevron-left" size={32} />
        </button>
      )}

      <div
        className="viewer-stage"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onImgPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <img
          src={`/uploads/${ev.image_path}`}
          alt={ev.title}
          draggable={false}
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transition: pointers.current.size ? "none" : "transform .18s ease-out",
            cursor: zoomed ? "grab" : "zoom-in",
          }}
        />
      </div>

      {index < list.length - 1 && !zoomed && (
        <button className="nav next" aria-label="Siguiente" onClick={(e) => { e.stopPropagation(); onIndex(index + 1); }}>
          <Icon name="chevron-right" size={32} />
        </button>
      )}

      <div className="viewer-caption">
        {TYPE_LABEL[ev.type] ?? ev.type} · {index + 1} / {list.length}
        {!zoomed && <span className="viewer-hint"> · pellizca o doble toque para acercar</span>}
      </div>
    </div>
  );
}
