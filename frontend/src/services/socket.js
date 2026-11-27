import { io } from 'socket.io-client'
import { useUserStore } from '@/stores/user'

export const socket = io({ autoConnect: false })

// Se ejecuta en CADA conexión, la primera y también cada reconexión
socket.on('connect', () => {
    const user = useUserStore()
    user.id = socket.id
    if (user.name) {
        socket.emit('user:hello', { name: user.name, avatar: user.color })
    }
})