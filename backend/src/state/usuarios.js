// Quién está conectado al hangar ahora mismo (nombre y color elegidos en la Entrada).
// Vive aparte de rooms.js porque lobby.js necesita leer estos datos al meter
// a alguien dentro de una nave.
const usuarios = new Map() // socket.id -> { id, name, color }

export function setUsuario(id, { name, color }) {
  usuarios.set(id, { id, name, color })
}

export function getUsuario(id) {
  return usuarios.get(id)
}

export function eliminarUsuario(id) {
  usuarios.delete(id)
}

export function listarUsuarios() {
  return Array.from(usuarios.values())
}
