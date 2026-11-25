const MAPS = ['plaza', 'museu', 'oficina', 'bar']
const rooms = new Map()

for (const mapId of MAPS) {
  rooms.set(mapId, {
    id: mapId, name: mapId, mapId,
    maxPlayers: 20,
    players: new Map(),   // socket.id -> Player
    objects: new Map()    // objectId -> WorldObject
  })
}

export const getRoom = (id) => rooms.get(id)

export const listRooms = () =>
  [...rooms.values()].map(({ id, name, mapId, maxPlayers, players }) =>
    ({ id, name, mapId, maxPlayers, playerCount: players.size }))

export function addPlayer(roomId, player) {
  rooms.get(roomId).players.set(player.id, player)
}

export function removePlayer(roomId, playerId) {
  rooms.get(roomId)?.players.delete(playerId)
}