const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { randomUUID } = require("crypto");

const app = express();
const server = http.createServer(app); // HTTP server shared by Express and Socket.IO
const io = new Server(server);

const PORT = process.env.BACKEND_PORT || 3000;

// Reglas de las naves (fijas, no las decide el cliente)
const MAX_PLAYERS = 5; // plazas de tripulación por nave
const MIN_PLAYERS = 2; // hacen falta al menos 2 para poder despegar

app.get("/api/estado", (req, res) => {
  res.json({ ok: true });
});

// socket.id -> { id, name, color }  (quien está conectado al hangar)
const usuarios = new Map();

// roomId -> nave  (las naves/salas que existen ahora mismo)
const naves = new Map();

// socket.id -> roomId  (en qué nave está cada jugador, para no estar en dos a la vez)
const jugadorEnNave = new Map();

// Manda a TODO el mundo la foto actual del hangar: usuarios conectados y naves.
// Los jugadores de cada nave se mandan como array porque un Map no se puede
// enviar por Socket.IO (llegaría como un objeto vacío al cliente).
function enviarEstadoLobby() {
  io.emit("server:lobbyState", {
    users: Array.from(usuarios.values()),
    rooms: Array.from(naves.values()).map((nave) => ({
      id: nave.id,
      nombre: nave.nombre,
      maxPlayers: nave.maxPlayers,
      capitanId: nave.capitanId,
      enMision: nave.enMision,
      jugadores: Array.from(nave.jugadores.values()),
    })),
  });
}

// Mete al jugador de ese socket dentro de la nave: copia su nombre/color,
// lo añade a la lista de tripulantes, y lo marca como "en esta nave".
function entrarEnNave(socket, nave) {
  const usuario = usuarios.get(socket.id);

  nave.jugadores.set(socket.id, {
    id: socket.id,
    name: usuario.name,
    color: usuario.color,
    ready: false,
  });

  jugadorEnNave.set(socket.id, nave.id);
  socket.join(nave.id); // sala de Socket.IO: para poder avisar solo a esta tripulación

  // Ojo: esta función no avisa a nadie (no llama a enviarEstadoLobby).
  // Eso lo decide quien la llama, para no mandar el aviso dos veces.
}

// Saca al jugador de la nave en la que estuviera (si estaba en alguna).
// Se usa tanto cuando alguien pulsa "Salir" como cuando se desconecta.
function salirDeNave(socket) {
  const roomId = jugadorEnNave.get(socket.id);
  if (!roomId) return; // no estaba en ninguna nave, no hay nada que hacer

  jugadorEnNave.delete(socket.id);

  const nave = naves.get(roomId);
  if (!nave) return; // por seguridad: si la nave ya no existiera, no petamos

  const eraCapitan = nave.capitanId === socket.id;

  nave.jugadores.delete(socket.id);
  socket.leave(roomId);

  if (nave.jugadores.size === 0) {
    // última persona fuera: la nave se borra entera
    naves.delete(roomId);
  } else if (eraCapitan) {
    // el capitán se fue: asciende el siguiente que entró (el primero que queda en el Map)
    nave.capitanId = nave.jugadores.keys().next().value;
  }

  // Tampoco avisa aquí: lo hace el handler que ha llamado a esta función.
}

io.on("connection", (socket) => {
  console.log("Conectado:", socket.id);

  // El jugador dice quién es (nombre + color) al entrar en el hangar
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

  // Crear una nave nueva: quien la crea entra directamente y es el capitán
  socket.on("client:createRoom", (datos, cb) => {
    if (typeof cb !== "function") return;

    const nombre = String(datos?.name || "").trim();
    const nombreValido =
      nombre.length >= 3 &&
      nombre.length <= 20 &&
      /^[\p{L}\d _-]+$/u.test(nombre);

    if (!nombreValido) {
      return cb({ ok: false, error: "Nombre no válido" });
    }
    if (jugadorEnNave.has(socket.id)) {
      return cb({ ok: false, error: "Ya estás en una nave" });
    }

    const nave = {
      id: randomUUID().slice(0, 8),
      nombre,
      maxPlayers: MAX_PLAYERS,
      capitanId: socket.id,
      enMision: false,
      jugadores: new Map(),
    };
    naves.set(nave.id, nave);

    entrarEnNave(socket, nave);

    cb({ ok: true, room: { id: nave.id } });
    enviarEstadoLobby();
  });

  // Unirse a una nave que ya existe
  socket.on("client:joinRoom", (datos, cb) => {
    if (typeof cb !== "function") return;

    const nave = naves.get(datos?.roomId);

    if (!nave) {
      return cb({ ok: false, error: "Esa nave ya no existe" });
    }
    if (nave.enMision) {
      return cb({ ok: false, error: "Esa nave ya ha despegado" });
    }
    if (nave.jugadores.size >= nave.maxPlayers) {
      return cb({ ok: false, error: "La nave está llena" });
    }
    if (jugadorEnNave.has(socket.id)) {
      return cb({ ok: false, error: "Ya estás en una nave" });
    }

    entrarEnNave(socket, nave);

    cb({ ok: true, room: { id: nave.id } });
    enviarEstadoLobby();
  });

  // Marcarse como listo / no listo dentro de tu nave
  socket.on("client:ready", (datos) => {
    const roomId = jugadorEnNave.get(socket.id);
    const nave = naves.get(roomId);
    if (!nave) return;

    const jugador = nave.jugadores.get(socket.id);
    if (!jugador) return;

    jugador.ready = Boolean(datos?.ready);
    enviarEstadoLobby();
  });

  // Salir de la nave actual (sin desconectarse del hangar)
  socket.on("client:salirNave", () => {
    salirDeNave(socket);
    enviarEstadoLobby();
  });

  // Despegar: solo puede hacerlo el capitán, y solo si todos están listos
  socket.on("client:startGame", (_datos, cb) => {
    if (typeof cb !== "function") cb = () => {};

    const roomId = jugadorEnNave.get(socket.id);
    const nave = naves.get(roomId);

    if (!nave) {
      return cb({ ok: false, error: "No estás en ninguna nave" });
    }
    if (nave.capitanId !== socket.id) {
      return cb({ ok: false, error: "Solo el capitán puede despegar" });
    }
    if (nave.jugadores.size < MIN_PLAYERS) {
      return cb({ ok: false, error: `Hacen falta al menos ${MIN_PLAYERS} tripulantes` });
    }
    const todosListos = Array.from(nave.jugadores.values()).every((j) => j.ready);
    if (!todosListos) {
      return cb({ ok: false, error: "Todavía no está todo el mundo listo" });
    }

    nave.enMision = true;

    cb({ ok: true });
    io.to(nave.id).emit("server:gameStart", { roomId: nave.id });
    enviarEstadoLobby();
  });

  socket.on("disconnect", () => {
    console.log("Desconectado:", socket.id);
    salirDeNave(socket);
    usuarios.delete(socket.id);
    enviarEstadoLobby(); // un solo aviso, ya con los dos cambios aplicados
  });
});

server.listen(PORT, () => {
  console.log(`Servidor en el puerto ${PORT}`);
});
