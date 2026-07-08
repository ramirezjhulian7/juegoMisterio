import { io, Socket } from "socket.io-client";

// Un unico socket para toda la app. El proxy de Vite reenvia /socket.io al back.
export const socket: Socket = io("/", { autoConnect: false });

/**
 * Identidad persistente del navegador. Permite reusar el mismo jugador al
 * recargar o reconectar, evitando duplicados en la lista de detectives.
 */
export function getClientId(): string {
  let id = localStorage.getItem("clientId");
  if (!id) {
    id =
      (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
      `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("clientId", id);
  }
  return id;
}
