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
        const player = data.playerId ? repo.getPlayer(data.playerId) : undefined;
        io.to(roomChannel(data.roomId)).emit("attempt:result", {
          objectiveId,
          answer: answer.trim(),
          correct, // 1 | 0 | null (null = no hay solucion configurada, verificar en la web)
          by: player?.name ?? "Alguien",
        });
        // El objetivo 1 (culpable) resuelve el caso al acertar.
        if (correct === 1) {
          const objectives = repo.getObjectives(repo.getRoom(data.roomId)!.case_id) as {
            id: number;
            position: number;
          }[];
          const first = objectives.find((o) => o.position === 0);
          if (first && first.id === objectiveId) {
            repo.markSolved(data.roomId);
            io.to(roomChannel(data.roomId)).emit("case:solved", {});
          }
        }
      }
    );

    // ===== Pistas =====
    socket.on("hint:reveal", () => {
      if (!data.roomId) return;
      const room = repo.getRoom(data.roomId);
      if (!room) return;
      const hint = repo.revealNextHint(room.id, room.case_id);
      if (hint) {
        io.to(roomChannel(room.id)).emit("hint:revealed", {
          hintId: hint.id,
          revealedHints: repo.getRevealedHints(room.id),
        });
      } else {
        socket.emit("error:msg", "No quedan más pistas.");
      }
    });

    // ===== Tablero de deduccion (hilos sospechoso <-> evidencia) =====
    socket.on(
      "deduction:add",
      ({
        suspectId,
        evidenceId,
        label = null,
      }: {
        suspectId: number;
        evidenceId: number;
        label?: string | null;
      }) => {
        if (!data.roomId) return;
        const d = repo.addDeduction(
          data.roomId,
          suspectId,
          evidenceId,
          data.playerId ?? null,
          label ? String(label).slice(0, 200) : null
        );
        io.to(roomChannel(data.roomId)).emit("deduction:added", d);
      }
    );

    socket.on("deduction:remove", ({ id }: { id: number }) => {
      if (!data.roomId) return;
      repo.removeDeduction(id, data.roomId);
      io.to(roomChannel(data.roomId)).emit("deduction:removed", { id });
    });

    // ===== Votacion final =====
    socket.on("vote", ({ suspectId }: { suspectId: number }) => {
      if (!data.roomId || !data.playerId) return;
      repo.castVote(data.roomId, data.playerId, suspectId);
      io.to(roomChannel(data.roomId)).emit("votes:update", repo.getVotes(data.roomId));
    });

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
