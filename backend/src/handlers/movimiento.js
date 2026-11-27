import { getRoomOfPlayer, getMap } from '../state/rooms.js'
import { validarMovimiento } from '../state/movimiento.js'
 
// Nombres de los eventos. Tienen que coincidir con lo que emite/escucha el cliente
// (services/movimiento.js) y con doc/protocol.md. Cambiad SOLO aquí si hace falta.
export const EVENTO_MOVER = 'client:move' // cliente -> servidor: { x, y, dir, anim? }
export const EVENTO_CORREGIR = 'player:correct' // servidor -> cliente: { x, y }
 
export function registerMovimientoHandlers(socket) {
  socket.on(EVENTO_MOVER, (datos) => {
    const room = getRoomOfPlayer(socket.id)
    const jugador = room?.players.get(socket.id)
    if (!jugador) return // no está en ninguna nave: se ignora
 
    const { ok, motivo } = validarMovimiento(jugador, datos, getMap(room.mapId))
 
    // Payload mal formado: se ignora sin más. Movimiento imposible: se le
    // devuelve a la última posición buena para que el cliente se recoloque.
    if (!ok && motivo !== 'INVALID_PAYLOAD') {
      socket.emit(EVENTO_CORREGIR, { x: jugador.x, y: jugador.y })
    }
  })
}
 