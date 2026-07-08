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
        const room = repo.getRoom(data.roomId);
        if (!room) return;

        const objectives = repo.getObjectives(room.case_id) as {
          id: number;
          position: number;
        }[];
        const isAccusation = objectives.find((o) => o.position === 0)?.id === objectiveId;

        // La acusación del culpable tiene cooldown tras fallar.
        if (isAccusation) {
          const lockLeft = repo.accusationLockSeconds(room.id);
          if (lockLeft > 0) {
            socket.emit(
              "error:msg",
              `Acusación bloqueada. Reúnan más pruebas: ${lockLeft}s restantes.`
            );
            return;
          }
        }

        const { correct } = repo.recordAttempt(
          room.id,
          objectiveId,
          data.playerId ?? null,
          answer.trim()
        );
        const player = data.playerId ? repo.getPlayer(data.playerId) : undefined;
        io.to(roomChannel(room.id)).emit("attempt:result", {
          objectiveId,
          answer: answer.trim(),
          correct,
          by: player?.name ?? "Alguien",
        });

        if (isAccusation && correct === 1) {
          repo.markSolved(room.id);
          io.to(roomChannel(room.id)).emit("case:solved", {});
        } else if (isAccusation && correct === 0) {
          // Castigo: bloquea nuevas acusaciones un rato.
          const { lockSeconds, wrong } = repo.penalizeWrongAccusation(room.id);
          io.to(roomChannel(room.id)).emit("accusation:locked", {
            lockSeconds,
            wrong,
            until: repo.accusationLockUntil(room.id),
          });
        }
      }
    );

    // ===== Registro / cateo de un sospechoso (gasta presupuesto compartido) =====
    socket.on("search:request", ({ suspectId }: { suspectId: number }) => {
      if (!data.roomId) return;
      const room = repo.getRoom(data.roomId);
      if (!room) return;
      const res = repo.requestSearch(room, suspectId, data.playerId ?? null);
      if (!res.ok) {
        socket.emit(
          "error:msg",
          res.reason === "no_budget"
            ? "No quedan órdenes de registro. Deduzcan con las pruebas que ya tienen."
            : "No se pudo realizar el registro."
        );
        return;
      }
      const player = data.playerId ? repo.getPlayer(data.playerId) : undefined;
      const suspect = repo.getSuspects(room.case_id).find((s) => s.id === suspectId);
      // Reenvía a todos el nuevo estado de evidencia visible + presupuesto.
      io.to(roomChannel(room.id)).emit("search:done", {
        suspectId,
        by: player?.name ?? "Alguien",
        suspectName: suspect?.name ?? "sospechoso",
        budgetLeft: res.budgetLeft,
        evidence: repo.getVisibleEvidence(room.case_id, room.id),
        searches: repo.getSearches(room.id),
      });
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

/**
 * Revisa periódicamente las salas con jugadores conectados y, cuando el reloj
 * desbloquea una nueva pista, la emite. Las pistas se basan en el tiempo desde
 * que se creó la sala (una cada 10 min), así que solo notificamos el cambio.
 */
export function startHintTimer(io: Server): void {
  const lastCount = new Map<number, number>();
  setInterval(() => {
    // Salas con al menos un socket conectado
    for (const [channel] of io.sockets.adapter.rooms) {
      if (!channel.startsWith("room:")) continue;
      const roomId = Number(channel.slice(5));
      const room = repo.getRoom(roomId);
      if (!room) continue;
      const unlocked = repo.unlockedHintCount(room, room.case_id);
      const prev = lastCount.get(roomId) ?? unlocked; // primera vez: no notifica de golpe
      if (unlocked > prev) {
        io.to(channel).emit("hints:unlocked", {
          unlockedHints: unlocked,
          hints: repo.getHints(room.case_id).slice(0, unlocked),
          secondsToNextHint: repo.secondsToNextHint(room, room.case_id),
        });
      }
      lastCount.set(roomId, unlocked);
    }
  }, 15 * 1000); // chequeo cada 15s
}
