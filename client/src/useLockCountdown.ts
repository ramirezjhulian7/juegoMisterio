import { useEffect, useState } from "react";

/**
 * Devuelve los segundos restantes hasta `until` (ISO), actualizándose cada segundo.
 * 0 cuando no hay bloqueo o ya expiró.
 */
export function useLockCountdown(until: string | null): number {
  const [left, setLeft] = useState(() => calc(until));

  useEffect(() => {
    setLeft(calc(until));
    if (!until) return;
    const t = setInterval(() => setLeft(calc(until)), 1000);
    return () => clearInterval(t);
  }, [until]);

  return left;
}

function calc(until: string | null): number {
  if (!until) return 0;
  const ms = Date.parse(until) - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 1000);
}
