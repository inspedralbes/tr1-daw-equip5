import { listRooms, createRoom, deleteRoomIfEmpty, summarize } from '../state/rooms.js'

export const LOBBY = 'lobby'

const CREATE_COOLDOWN_MS = 5000   // mínim entre dues creacions del mateix jugador
const EMPTY_ROOM_TTL_MS = 60_000  // una sala nova que ningú ocupa s'esborra al cap d'1 minut

const MESSAGES = {
  INVALID_PAYLOAD: 'Dades de sala no vàlides',
  MAP_NOT_FOUND: 'El mapa no existeix',
  ROOM_NAME_TAKEN: 'Ja hi ha una sala amb aquest nom',
  TOO_MANY_ROOMS: 'Hi ha massa sales creades',
  RATE_LIMITED: 'Espera uns segons abans de crear una altra sala'
}

const fail = (code) => ({ ok: false, error: { code, message: MESSAGES[code] } })

// Envia la llista actualitzada a tothom qui és al lobby.
// Cal cridar-la també des de handlers/room.js quan algú entra o surt d'una sala.
export const broadcastRooms = (io) =>
  io.to(LOBBY).emit('lobby:rooms-updated', { rooms: listRooms() })

export function registerLobbyHandlers(io, socket) {
  socket.join(LOBBY) 
  let lastCreate = 0

  socket.on('lobby:list-rooms', (_payload, cb) => {
    if (typeof cb !== 'function') return
    cb({ ok: true, data: { rooms: listRooms() } })
  })

  socket.on('lobby:create-room', (payload, cb) => {
    if (typeof cb !== 'function') return

    const name = typeof payload?.name === 'string' ? payload.name.trim() : ''
    const { mapId, maxPlayers } = payload ?? {}
    if (
      name.length < 3 || name.length > 30 ||
      typeof mapId !== 'string' ||
      (maxPlayers !== undefined && !Number.isInteger(maxPlayers))
    ) {
      return cb(fail('INVALID_PAYLOAD'))
    }

    if (Date.now() - lastCreate < CREATE_COOLDOWN_MS) return cb(fail('RATE_LIMITED'))

    const result = createRoom({ name, mapId, maxPlayers })
    if (result.error) return cb(fail(result.error))

    lastCreate = Date.now()
    const { room } = result
    cb({ ok: true, data: { room: summarize(room) } })
    broadcastRooms(io)

    setTimeout(() => {
      if (deleteRoomIfEmpty(room.id)) broadcastRooms(io)
    }, EMPTY_ROOM_TTL_MS)
  })
}