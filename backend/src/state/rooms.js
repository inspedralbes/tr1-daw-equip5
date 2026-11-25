import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'

const dir = new URL('../maps/', import.meta.url)

const maps = new Map()   // mapId  -> JSON del mapa (plantilla: zones, spawn, mida...)
const rooms = new Map()  // roomId -> sala (instància d'un mapa amb els seus jugadors)

export const MAX_ROOMS = 20

function newRoom({ id, name, mapId, maxPlayers, permanent }) {
  const map = maps.get(mapId)
  return {
    id,
    name,
    mapId,
    maxPlayers,
    permanent,                 // true = sales per defecte (una per mapa), mai s'esborren
    players: new Map(),        // socket.id -> Player
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

export const summarize = (room) => ({
  id: room.id,
  name: room.name,
  mapId: room.mapId,
  playerCount: room.players.size,
  maxPlayers: room.maxPlayers
})

export const listRooms = () => [...rooms.values()].map(summarize)

// ---------- jugadors ----------
export function addPlayer(roomId, player) {
  rooms.get(roomId).players.set(player.id, player)
}

export function removePlayer(roomId, playerId) {
  rooms.get(roomId)?.players.delete(playerId)
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