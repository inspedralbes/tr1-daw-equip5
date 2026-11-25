import express from "express";
import http from "http";
import { Server } from "socket.io";
import { registerLobbyHandlers } from "./handlers/lobby.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.BACKEND_PORT || 3000;

app.get("/api/estado", (req, res) => {
  res.json({ ok: true });
});

const usuarios = new Map();

function enviarEstadoLobby() {
  io.emit("server:lobbyState", { users: Array.from(usuarios.values()) });
}

io.on("connection", (socket) => {
  console.log("Conectado:", socket.id);

  registerLobbyHandlers(io, socket); // ← Ilia's events: lobby:list-rooms, lobby:create-room

  socket.on("client:hello", (datos) => {
    const name = String(datos?.name || "")
      .trim()
      .slice(0, 16);
    if (name.length < 2) return;
    usuarios.set(socket.id, {
      id: socket.id,
      name,
      color: datos.avatar || "#64b5f6",
    });

    enviarEstadoLobby();
  });

  socket.on("disconnect", () => {
    console.log("Desconectado:", socket.id);
    usuarios.delete(socket.id);
    enviarEstadoLobby();
  });
});

server.listen(PORT, () => {
  console.log(`Servidor en el puerto ${PORT}`);
});
