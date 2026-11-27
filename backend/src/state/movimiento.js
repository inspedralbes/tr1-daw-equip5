// Validación de movimiento en el servidor: lógica pura, sin sockets.
// El cliente dice "estoy en (x, y)" y el servidor decide si es creíble.

// Velocidad máxima del jugador en píxeles/segundo. Tiene que ser la MISMA que usa
// el cliente (VELOCIDAD en NaveScene / jugador). Si el cliente cambia, cambiar aquí.
export const VELOCIDAD_MAX = 160

// Margen sobre la velocidad real, por lag e imprecisiones (el protocolo dice x1.5)
export const TOLERANCIA = 1.5

// Cuánto movimiento "ahorrado" se permite acumular (ms). Sirve para que, si dos
// mensajes llegan casi a la vez por un pequeño atasco de red, no se rechace al
// jugador por ir "demasiado rápido" cuando en realidad va normal.
const RAFAGA_MAX_MS = 500

// Si pasa mucho tiempo sin mensajes, no se acumula más que esto (ms)
const DT_MAX_MS = 1000

// Tamaño del mapa por si el JSON del servidor no trae width/height (40x25 tiles de 32 px)
const ANCHO_POR_DEFECTO = 1280
const ALTO_POR_DEFECTO = 800

const DIRECCIONES = ['up', 'down', 'left', 'right']
const ANIMACIONES = ['idle', 'walk']

// Datos internos de la validación (último instante y "presupuesto" de distancia).
// Van en un WeakMap para que NO se envíen a los clientes con el resto del jugador.
const estado = new WeakMap()

const esNumero = (n) => typeof n === 'number' && Number.isFinite(n)

// Devuelve { ok: true } o { ok: false, motivo }.
// motivo: 'INVALID_PAYLOAD' | 'OUT_OF_BOUNDS' | 'TOO_FAST'
// Si es válido, actualiza jugador.x, y, dir y anim. Si no, NO los toca.
export function validarMovimiento(jugador, datos, mapa, ahora = Date.now()) {
  const { x, y, dir, anim } = datos ?? {}

  if (
    !esNumero(x) ||
    !esNumero(y) ||
    !DIRECCIONES.includes(dir) ||
    (anim !== undefined && !ANIMACIONES.includes(anim))
  ) {
    return { ok: false, motivo: 'INVALID_PAYLOAD' }
  }

  const ancho = mapa?.width ?? ANCHO_POR_DEFECTO
  const alto = mapa?.height ?? ALTO_POR_DEFECTO
  if (x < 0 || y < 0 || x > ancho || y > alto) {
    return { ok: false, motivo: 'OUT_OF_BOUNDS' }
  }

  const maxPresupuesto = VELOCIDAD_MAX * TOLERANCIA * (RAFAGA_MAX_MS / 1000)

  // Primer movimiento: punto de partida = spawn del mapa (si lo tiene)
  // o, si no, la primera posición recibida
  let est = estado.get(jugador)
  if (!est) {
    const inicio = mapa?.spawn ?? { x, y }
    jugador.x = inicio.x
    jugador.y = inicio.y
    est = { t: ahora, presupuesto: maxPresupuesto }
    estado.set(jugador, est)
  }

  // Con el tiempo transcurrido se "gana" distancia permitida (con tope)
  const dt = Math.min(Math.max(ahora - est.t, 0), DT_MAX_MS)
  est.presupuesto = Math.min(
    est.presupuesto + VELOCIDAD_MAX * TOLERANCIA * (dt / 1000),
    maxPresupuesto,
  )
  est.t = ahora

  const distancia = Math.hypot(x - jugador.x, y - jugador.y)
  if (distancia > est.presupuesto) {
    return { ok: false, motivo: 'TOO_FAST' }
  }

  est.presupuesto -= distancia
  jugador.x = x
  jugador.y = y
  jugador.dir = dir
  if (anim !== undefined) jugador.anim = anim
  return { ok: true }
}