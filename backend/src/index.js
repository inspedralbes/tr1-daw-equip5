import express from "express";
import http from "http";
import { Server } from "socket.io";
import { registerLobbyHandlers, broadcastRooms } from "./handlers/lobby.js";
import { setUsuario, eliminarUsuario, listarUsuarios } from "./state/usuarios.js";
import { leaveRoom } from "./state/rooms.js";

const app = express();
const server = http.createServer(app); // HTTP server shared by Express and Socket.IO
const io = new Server(server);

const PORT = process.env.BACKEND_PORT || 3000;

app.get("/api/estado", (req, res) => {
  res.json({ ok: true });
});

// Manda a todo el mundo quién está conectado al hangar.
// Las naves van aparte, por lobby:rooms-updated (ver handlers/lobby.js).
function enviarEstadoLobby() {
  io.emit("lobby:users-updated", { users: listarUsuarios() });
}

io.on("connection", (socket) => {
  console.log("Conectado:", socket.id);

  registerLobbyHandlers(io, socket); // eventos lobby:list-rooms, lobby:create-room, lobby:join-room...

  // El jugador dice quién es (nombre + color) al entrar en el hangar
  socket.on("user:hello", (datos) => {
    const name = String(datos?.name || "")
      .trim()
      .slice(0, 16);
    if (name.length < 2) return;

    setUsuario(socket.id, { name, color: datos.avatar || "#64b5f6" });

    enviarEstadoLobby();
  });

  socket.on("disconnect", () => {
    console.log("Desconectado:", socket.id);
    leaveRoom(socket.id); // si estaba en una nave, sale de ella (y asciende capitán si hacía falta)
    eliminarUsuario(socket.id);
    enviarEstadoLobby();
    broadcastRooms(io);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor en el puerto ${PORT}`);
});
