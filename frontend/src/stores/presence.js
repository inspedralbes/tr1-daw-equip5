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
      if (this.escuchando) return // only once
      this.escuchando = true

      socket.on('server:lobbyState', (datos) => {
        this.users = datos.users
        this.rooms = datos.rooms
      })
    },
  },
})
