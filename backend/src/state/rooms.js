import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'

const dir = new URL('../maps/', import.meta.url)

const maps = new Map()   // mapId  -> JSON del mapa (plantilla: zones, spawn, mida...)
const rooms = new Map()  // roomId -> sala (instància d'un mapa amb els seus jugadors)

// socket.id -> roomId: en quina nau és cada jugador, per no poder-ne tenir dues alhora
const jugadorEnNave = new Map()

export const MAX_ROOMS = 20
export const MIN_PLAYERS = 2 // calen com a mínim 2 tripulants per poder enlairar

function newRoom({ id, name, mapId, maxPlayers, permanent }) {
  const map = maps.get(mapId)
  return {
    id,
    name,
    mapId,
    maxPlayers,
    permanent,                 // true = sales per defecte (una per mapa), mai s'esborren
    capitanId: null,           // el posa el primer que hi entra (joinRoom)
    enMision: false,           // true des que el capità "enlaira"
    players: new Map(),        // socket.id -> { id, name, color, ready }
    // structuredClone: cada sala té el SEU estat d'objectes, encara que comparteixin mapa
    objects: new Map(map.objects.map((o) => [o.id, structuredClone(o)]))
  }
}

// Càrrega inicial: una sala permanent per cada JSON de maps/
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const map = JSON.parse(readFileSync(new URL(file, dir), 'utf-8'))
  maps.set(map.id, map)
  rooms.set(
    map.id,
    newRoom({ id: map.id, name: map.name, mapId: map.id, maxPlayers: map.maxPlayers, permanent: true })
  )
}

// ---------- consultes ----------
export const getRoom = (id) => rooms.get(id)
export const getMap = (mapId) => maps.get(mapId)
export const getRoomOfPlayer = (socketId) => rooms.get(jugadorEnNave.get(socketId))

// Els jugadors es guarden com a Map (per poder afegir/treure per socket.id),
// però Socket.IO no sap enviar un Map: per això es converteix a array aquí.
export const summarize = (room) => ({
  id: room.id,
  name: room.name,
  mapId: room.mapId,
  maxPlayers: room.maxPlayers,
  capitanId: room.capitanId,
  enMision: room.enMision,
  jugadores: Array.from(room.players.values())
})

export const listRooms = () => [...rooms.values()].map(summarize)

// ---------- jugadors ----------
// Retorna { room } o { error: <codi> }
export function joinRoom(roomId, usuario) {
  const room = rooms.get(roomId)
  if (!room) return { error: 'ROOM_NOT_FOUND' }
  if (room.enMision) return { error: 'ROOM_IN_MISSION' }
  if (room.players.size >= room.maxPlayers) return { error: 'ROOM_FULL' }
  if (jugadorEnNave.has(usuario.id)) return { error: 'ALREADY_IN_ROOM' }

  room.players.set(usuario.id, {
    id: usuario.id,
    name: usuario.name,
    color: usuario.color,
    ready: false
  })
  jugadorEnNave.set(usuario.id, roomId)

  // El primer que entra (el que crea la nau, o qui sigui a la sala per defecte) és el capità
  if (!room.capitanId) room.capitanId = usuario.id

  return { room }
}

// Treu el jugador de la seva nau actual (si n'hi ha una). Retorna el roomId
// del que ha sortit, o null si no estava enlloc.
export function leaveRoom(socketId) {
  const roomId = jugadorEnNave.get(socketId)
  if (!roomId) return null

  jugadorEnNave.delete(socketId)

  const room = rooms.get(roomId)
  if (!room) return roomId // per seguretat: índex apuntava a una sala que ja no existeix

  const eraCapitan = room.capitanId === socketId
  room.players.delete(socketId)

  if (room.players.size === 0) {
    room.capitanId = null
    room.enMision = false
    const map = maps.get(room.mapId)
    room.objects = new Map(map.objects.map((o) => [o.id, structuredClone(o)]))
    deleteRoomIfEmpty(roomId)   // las no permanentes se borran; las permanentes quedan como nuevas
  } else if (eraCapitan) {
    room.capitanId = room.players.keys().next().value
  }

  return roomId
}

export function setReady(socketId, ready) {
  const room = getRoomOfPlayer(socketId)
  const jugador = room?.players.get(socketId)
  if (!jugador) return
  jugador.ready = Boolean(ready)
}

// Retorna { room } o { error: <codi> }
export function startGame(socketId) {
  const room = getRoomOfPlayer(socketId)
  if (!room) return { error: 'NOT_IN_ROOM' }
  if (room.capitanId !== socketId) return { error: 'NOT_CAPTAIN' }
  if (room.players.size < MIN_PLAYERS) return { error: 'NOT_ENOUGH_PLAYERS' }

  const todosListos = [...room.players.values()].every((j) => j.ready)
  if (!todosListos) return { error: 'NOT_EVERYONE_READY' }

  room.enMision = true
  return { room }
}

// ---------- crear / esborrar sales ----------
// Retorna { room } o { error: <codi del protocol> }
export function createRoom({ name, mapId, maxPlayers }) {
  const map = maps.get(mapId)
  if (!map) return { error: 'MAP_NOT_FOUND' }
  if (rooms.size >= MAX_ROOMS) return { error: 'TOO_MANY_ROOMS' }

  const lower = name.toLowerCase()
  if ([...rooms.values()].some((r) => r.name.toLowerCase() === lower)) {
    return { error: 'ROOM_NAME_TAKEN' }
  }

  const id = `${mapId}-${randomUUID().slice(0, 8)}`
  const max = Math.min(Math.max(maxPlayers ?? map.maxPlayers, 2), map.maxPlayers)
  const room = newRoom({ id, name, mapId, maxPlayers: max, permanent: false })
  rooms.set(id, room)
  return { room }
}

export function deleteRoomIfEmpty(id) {
  const room = rooms.get(id)
  if (!room || room.permanent || room.players.size > 0) return false
  return rooms.delete(id)
}
