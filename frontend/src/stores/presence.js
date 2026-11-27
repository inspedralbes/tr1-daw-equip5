import { defineStore } from 'pinia'
import { socket } from '@/services/socket'

export const usePresenceStore = defineStore('presence', {
  state: () => ({
    users: [],
    rooms: [],
    escuchando: false,
  }),

  actions: {
    escuchar() {
      if (this.escuchando) return
      this.escuchando = true

      socket.on('server:lobbyState', (datos) => {
        this.users = datos.users
      })
      socket.on('lobby:rooms-updated', (datos) => {
        this.rooms = datos.rooms
      })

      socket.on('connect', () => {
        socket.emit('lobby:list-rooms', null, (res) => {
          if (res?.ok) this.rooms = res.data.rooms
        })
      })
    },
  },
})
