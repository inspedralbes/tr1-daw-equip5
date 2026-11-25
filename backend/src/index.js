const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app); // HTTP server shared by Express and Socket.IO
const io = new Server(server);

const PORT = process.env.BACKEND_PORT || 3000;

app.get("/api/estado", (req, res) => {
  res.json({ ok: true });
});

const usuarios = new Map();

function enviarEstadoLobby() {
  io.emit("server:lobbyState", {
    users: Array.from(usuarios.values()),
    rooms: [],
  });
}

io.on("connection", (socket) => {
  console.log("Conectado:", socket.id);

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
