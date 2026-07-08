import { io, Socket } from "socket.io-client";

// Un unico socket para toda la app. El proxy de Vite reenvia /socket.io al back.
export const socket: Socket = io("/", { autoConnect: false });
