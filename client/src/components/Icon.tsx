// Iconos SVG (trazos estilo Lucide). Reemplazan los emojis de la interfaz.
// Uso: <Icon name="files" /> — hereda color (currentColor) y tamaño (1em o prop size).

type IconName =
  | "files"
  | "clock"
  | "puzzle"
  | "vote"
  | "bulb"
  | "search"
  | "notebook"
  | "users"
  | "copy"
  | "exit"
  | "check"
  | "close"
  | "chevron-left"
  | "chevron-right"
  | "lock"
  | "detective";

const PATHS: Record<IconName, string> = {
  // rutas dentro de un viewBox 24x24
  files:
    "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z M15 2v5h5",
  clock: "M12 7v5l3 2 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  puzzle:
    "M9 3a2 2 0 0 1 4 0c0 .5-.2 1 .5 1H16a1 1 0 0 1 1 1v2.5c0 .7.5.5 1 .5a2 2 0 0 1 0 4c-.5 0-1-.2-1 .5V19a1 1 0 0 1-1 1h-2.5c-.7 0-.5.5-.5 1a2 2 0 0 1-4 0c0-.5.2-1-.5-1H6a1 1 0 0 1-1-1v-2.5c0-.7-.5-.5-1-.5a2 2 0 0 1 0-4c.5 0 1 .2 1-.5V6a1 1 0 0 1 1-1h2.5c.7 0 .5-.5.5-1z",
  vote: "M9 12l2 2 4-4 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  bulb:
    "M9 18h6 M10 22h4 M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z",
  search: "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M21 21l-4.3-4.3",
  notebook:
    "M4 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M8 2v20 M12 7h4 M12 11h4",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8",
  copy:
    "M9 9h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2z M5 15H4a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1",
  exit: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  check: "M20 6L9 17l-5-5",
  close: "M18 6L6 18 M6 6l12 12",
  "chevron-left": "M15 18l-6-6 6-6",
  "chevron-right": "M9 18l6-6-6-6",
  lock:
    "M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z M8 11V7a4 4 0 0 1 8 0v4",
  detective:
    "M12 3a3 3 0 0 0-3 3c0 1 .5 2 1 2.5L7 11H4l2 4 M12 3a3 3 0 0 1 3 3c0 1-.5 2-1 2.5l3 2.5h3l-2 4 M4 20h16",
};

interface Props {
  name: IconName;
  size?: number | string;
  className?: string;
  strokeWidth?: number;
}

export default function Icon({ name, size = "1.25em", className, strokeWidth = 2 }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name].split(" M").map((seg, i) => (
        <path key={i} d={(i === 0 ? seg : "M" + seg)} />
      ))}
    </svg>
  );
}
