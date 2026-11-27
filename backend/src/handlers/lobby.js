import {
  listRooms, createRoom, deleteRoomIfEmpty, summarize,
  joinRoom, leaveRoom, setReady, startGame, getRoomOfPlayer
} from '../state/rooms.js'
import { getUsuario } from '../state/usuarios.js'

export const LOBBY = 'lobby'

const CREATE_COOLDOWN_MS = 5000   // mínim entre dues creacions del mateix jugador
const EMPTY_ROOM_TTL_MS = 60_000  // una sala nova que ningú ocupa s'esborra al cap d'1 minut

const MESSAGES = {
  INVALID_PAYLOAD: 'Dades de sala no vàlides',
  MAP_NOT_FOUND: 'El mapa no existeix',
  ROOM_NOT_FOUND: 'Aquesta nau ja no existeix',
  ROOM_NAME_TAKEN: 'Ja hi ha una sala amb aquest nom',
  TOO_MANY_ROOMS: 'Hi ha massa sales creades',
  RATE_LIMITED: 'Espera uns segons abans de crear una altra sala',
  ROOM_FULL: 'La nau està plena',
  ROOM_IN_MISSION: 'Aquesta nau ja ha enlairat',
  ALREADY_IN_ROOM: 'Ja ets en una altra nau',
  NOT_IN_ROOM: 'No ets en cap nau',
  NOT_CAPTAIN: 'Només el capità pot enlairar',
  NOT_ENOUGH_PLAYERS: 'Falten tripulants per enlairar',
  NOT_EVERYONE_READY: 'Encara no esteu tots a punt'
}

const fail = (code) => ({ ok: false, error: { code, message: MESSAGES[code] } })

// Envia la llista actualitzada a tothom qui és al lobby.
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

    const usuario = getUsuario(socket.id)
    if (!usuario) return cb(fail('INVALID_PAYLOAD')) // no hauria de passar: cal fer client:hello abans

    // NUEVO: si ya está en una nave, no se crea nada
    if (getRoomOfPlayer(socket.id)) return cb(fail('ALREADY_IN_ROOM'))

    const result = createRoom({ name, mapId, maxPlayers })
    if (result.error) return cb(fail(result.error))

    const { room } = result

    // NUEVO: se comprueba el resultado; si falla, se deshace la sala creada
    const joined = joinRoom(room.id, usuario)
    if (joined.error) {
      deleteRoomIfEmpty(room.id)
      return cb(fail(joined.error))
    }

    lastCreate = Date.now()
    socket.join(room.id)

    cb({ ok: true, data: { room: summarize(room) } })
    broadcastRooms(io)

    setTimeout(() => {
      if (deleteRoomIfEmpty(room.id)) broadcastRooms(io)
    }, EMPTY_ROOM_TTL_MS)
  })

  socket.on('lobby:join-room', (payload, cb) => {
    if (typeof cb !== 'function') return

    const usuario = getUsuario(socket.id)
    if (!usuario) return cb(fail('INVALID_PAYLOAD'))

    const result = joinRoom(payload?.roomId, usuario)
    if (result.error) return cb(fail(result.error))

    socket.join(result.room.id)

    cb({ ok: true, data: { room: summarize(result.room) } })
    broadcastRooms(io)
  })

  socket.on('lobby:leave-room', (_payload, cb) => {
    const roomId = leaveRoom(socket.id)
    if (roomId) socket.leave(roomId)

    if (typeof cb === 'function') cb({ ok: true })
    broadcastRooms(io)
  })

  // Marcar-se llest / no llest: no cal ack, és només un toggle
  socket.on('lobby:ready', (payload) => {
    setReady(socket.id, payload?.ready)
    broadcastRooms(io)
  })
  
  socket.on('lobby:start-game', (_payload, cb) => {
    if (typeof cb !== 'function') return

    const result = startGame(socket.id)
    if (result.error) return cb(fail(result.error))

    cb({ ok: true })
    io.to(result.room.id).emit('lobby:game-started', { roomId: result.room.id })
    broadcastRooms(io)
  })
}
