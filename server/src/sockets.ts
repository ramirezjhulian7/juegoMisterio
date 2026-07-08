import type { Server, Socket } from "socket.io";
import * as repo from "./repo.js";

interface SocketData {
  roomId?: number;
  playerId?: number;
  roomCode?: string;
}

/**
 * Eventos cliente -> servidor:
 *   room:join   { code, name }            -> se une a la sala, recibe room:state
 *   note:add    { text, evidenceId?, suspectId? }
 *   note:delete { noteId }
 *   board:set   { suspectId, status }
 *   attempt     { objectiveId, answer }
 *
 * Eventos servidor -> sala:
 *   room:state, players:update, note:added, note:deleted, board:updated, attempt:result
 */
export function registerSockets(io: Server): void {
  io.on("connection", (socket: Socket) => {
    const data = socket.data as SocketData;

    socket.on("room:join", ({ code, name }: { code: string; name: string }) => {
      const room = repo.getRoomByCode(String(code ?? ""));
      if (!room) {
        socket.emit("error:msg", "Sala no encontrada.");
        return;
      }
      const players = repo.getPlayers(room.id);
      if (players.length >= room.max_players) {
        socket.emit("error:msg", `La sala esta llena (max ${room.max_players}).`);
        return;
      }

      const player = repo.addPlayer(room.id, String(name ?? "Detective").slice(0, 30));
      data.roomId = room.id;
      data.playerId = player.id;
      data.roomCode = room.code;

      socket.join(roomChannel(room.id));
      // Estado completo solo para quien entra
      socket.emit("room:state", { ...repo.getRoomState(room), you: player });
      // Aviso al resto
      io.to(roomChannel(room.id)).emit("players:update", repo.getPlayers(room.id));
    });

    socket.on(
      "note:add",
      ({
        text,
        evidenceId = null,
        suspectId = null,
      }: {
        text: string;
        evidenceId?: number | null;
        suspectId?: number | null;
      }) => {
        if (!data.roomId || !text?.trim()) return;
        const note = repo.addNote(
          data.roomId,
          data.playerId ?? null,
          text.trim().slice(0, 2000),
          evidenceId,
          suspectId
        );
        io.to(roomChannel(data.roomId)).emit("note:added", note);
      }
    );

    socket.on("note:delete", ({ noteId }: { noteId: number }) => {
      if (!data.roomId) return;
      repo.deleteNote(noteId, data.roomId);
      io.to(roomChannel(data.roomId)).emit("note:deleted", { noteId });
    });

    socket.on(
      "board:set",
      ({ suspectId, status }: { suspectId: number; status: string }) => {
        if (!data.roomId) return;
        const valid = ["unknown", "prime", "maybe", "cleared"];
        if (!valid.includes(status)) return;
        repo.setBoardStatus(data.roomId, suspectId, status);
        io.to(roomChannel(data.roomId)).emit("board:updated", { suspectId, status });
      }
    );

    socket.on(
      "attempt",
      ({ objectiveId, answer }: { objectiveId: number; answer: string }) => {
        if (!data.roomId || !answer?.trim()) return;
        const { correct } = repo.recordAttempt(
          data.roomId,
          objectiveId,
          data.playerId ?? null,
          answer.trim()
        );
        if (correct === 1) repo.markSolved(data.roomId);
        const player = data.playerId ? repo.getPlayer(data.playerId) : undefined;
        io.to(roomChannel(data.roomId)).emit("attempt:result", {
          objectiveId,
          answer: answer.trim(),
          correct, // 1 | 0 | null (null = no hay solucion configurada, verificar en la web)
          by: player?.name ?? "Alguien",
        });
      }
    );

    socket.on("disconnect", () => {
      if (data.playerId && data.roomId) {
        repo.setPlayerOnline(data.playerId, false);
        io.to(roomChannel(data.roomId)).emit("players:update", repo.getPlayers(data.roomId));
      }
    });
  });
}

function roomChannel(roomId: number): string {
  return `room:${roomId}`;
}
