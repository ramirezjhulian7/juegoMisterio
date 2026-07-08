import { useEffect, useState } from "react";
import type { Hint } from "../types";

interface Props {
  hints: Hint[]; // ya vienen recortadas al nº desbloqueado
  unlockedHints: number;
  secondsToNextHint: number | null;
}

export default function Hints({ hints, unlockedHints, secondsToNextHint }: Props) {
  const [countdown, setCountdown] = useState<number | null>(secondsToNextHint);

  // Cuenta regresiva local hasta la próxima pista.
  useEffect(() => {
    setCountdown(secondsToNextHint);
  }, [secondsToNextHint, unlockedHints]);

  useEffect(() => {
    if (countdown == null) return;
    const t = setInterval(() => {
      setCountdown((c) => (c == null ? c : Math.max(0, c - 1)));
    }, 1000);
    return () => clearInterval(t);
  }, [countdown == null]);

  const mmss = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="hints">
      <h3>💡 Pistas ({unlockedHints})</h3>
      {hints.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          Las pistas se desbloquean solas con el tiempo. Investiguen mientras tanto.
        </p>
      )}
      {hints.map((h, i) => (
        <div key={h.id} className="hint-item">
          <span className="hint-n">{i + 1}</span> {h.text}
        </div>
      ))}
      {countdown != null ? (
        <div className="hint-timer">
          ⏳ Próxima pista en <strong>{mmss(countdown)}</strong>
        </div>
      ) : (
        hints.length > 0 && (
          <p style={{ color: "var(--muted)", fontSize: 12 }}>Ya se revelaron todas las pistas.</p>
        )
      )}
    </div>
  );
}
