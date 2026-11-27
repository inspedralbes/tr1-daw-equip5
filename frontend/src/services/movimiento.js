import { bus } from '@/game/bus'
import { socket } from '@/services/socket'

// Puente Phaser -> servidor: escucha 'player:moved' en el bus y lo envía
// al servidor como 'client:move', con un máximo de 10 envíos por segundo
// y solo si algo ha cambiado.

const INTERVALO_MS = 100

let ultimoEnvio = 0
let ultimoEnviado = null
let pendiente = null
let temporizador = null

function hayCambio(a, b) {
  return !b || a.x !== b.x || a.y !== b.y || a.dir !== b.dir || a.anim !== b.anim
}

function enviar(pos) {
  if (!hayCambio(pos, ultimoEnviado)) return

  ultimoEnviado = pos
  ultimoEnvio = Date.now()

  // volatile: si un mensaje se pierde no pasa nada, llegará el siguiente
  socket.volatile.emit('client:move', pos)
}

function alMoverse(pos) {
  const espera = INTERVALO_MS - (Date.now() - ultimoEnvio)

  if (espera <= 0) {
    enviar(pos)
    return
  }

  // Demasiado pronto: nos quedamos con la posición más reciente y la
  // enviamos cuando se cumpla el intervalo. Así no se pierde nunca el
  // último mensaje (por ejemplo, el de anim: 'idle' al pararse).
  pendiente = pos
  if (!temporizador) {
    temporizador = setTimeout(() => {
      temporizador = null
      if (pendiente) {
        enviar(pendiente)
        pendiente = null
      }
    }, espera)
  }
}

export function iniciarMovimiento() {
  bus.on('player:moved', alMoverse)
}

export function detenerMovimiento() {
  bus.off('player:moved', alMoverse)
  clearTimeout(temporizador)
  temporizador = null
  pendiente = null
  ultimoEnviado = null
  ultimoEnvio = 0
}