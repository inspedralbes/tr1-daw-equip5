import { bus } from './bus'

// Gestiona a los demás jugadores dentro de la escena de Phaser:
// los crea, los mueve de forma suave y los quita cuando se van.
// Solo habla con el bus, nunca con el socket (ver doc/arquitectura/bus-vue-phaser.md).

// Cuanto menor es este valor, más rápido alcanza el avatar la posición recibida
const SUAVIZADO_MS = 80

// Si la posición nueva está más lejos que esto, el avatar salta directamente
// (aparición, corrección del servidor) en vez de deslizarse por el mapa
const DISTANCIA_SALTO = 200

// Animaciones de andar del spritesheet 'astronauta' (public/assets/README.md).
// `reposo` es el frame que se muestra cuando el jugador está parado.
export const ANIMACIONES = {
  down: { clave: 'abajo', reposo: 0 },
  up: { clave: 'arriba', reposo: 4 },
  left: { clave: 'lado-a', reposo: 8 },
  right: { clave: 'lado-b', reposo: 12 },
}

// Las animaciones son globales en Phaser: si el jugador local ya las creó, no se repiten
export function crearAnimaciones(scene) {
  for (const { clave, reposo } of Object.values(ANIMACIONES)) {
    if (scene.anims.exists(clave)) continue
    scene.anims.create({
      key: clave,
      frames: scene.anims.generateFrameNumbers('astronauta', {
        start: reposo,
        end: reposo + 3,
      }),
      frameRate: 8,
      repeat: -1,
    })
  }
}

export default class AvataresRemotos {
  constructor(scene) {
    this.scene = scene
    this.avatares = new Map() // id -> { sprite, etiqueta, objetivo, dir }
    this.destruido = false

    crearAnimaciones(scene)

    this.alIniciar = ({ myId, users }) => {
      users.forEach((u) => {
        if (u.id !== myId) this.crear(u)
      })
    }
    this.alEntrar = (u) => this.crear(u)
    this.alSalir = ({ id }) => this.quitar(id)
    this.alRecibirPosiciones = (lista) => lista.forEach((p) => this.fijarObjetivo(p))

    bus.on('game:init', this.alIniciar)
    bus.on('remote:joined', this.alEntrar)
    bus.on('remote:left', this.alSalir)
    bus.on('remote:positions', this.alRecibirPosiciones)

    // Limpiar al cerrar la escena para que los mensajes no lleguen repetidos
    scene.events.once('shutdown', () => this.destruir())
    scene.events.once('destroy', () => this.destruir())
  }

  crear({ id, name, color, x, y }) {
    if (this.avatares.has(id)) return

    const sprite = this.scene.add.sprite(x, y, 'astronauta', ANIMACIONES.down.reposo).setDepth(10)

    // El traje es blanco en el spritesheet: se tiñe con el color elegido en la entrada
    if (color) sprite.setTint(Number.parseInt(color.replace('#', ''), 16))

    const etiqueta = this.scene.add
      .text(x, y - 24, name ?? '', {
        fontSize: '12px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(11)

    this.avatares.set(id, { sprite, etiqueta, objetivo: { x, y }, dir: 'down' })
  }

  quitar(id) {
    const avatar = this.avatares.get(id)
    if (!avatar) return
    avatar.sprite.destroy()
    avatar.etiqueta.destroy()
    this.avatares.delete(id)
  }

  // Llega una posición del servidor: no se coloca el avatar directamente,
  // solo se guarda como destino. El movimiento lo hace update().
  fijarObjetivo({ id, x, y, dir, anim }) {
    const avatar = this.avatares.get(id)
    if (!avatar) return // posición de alguien que aún no conocemos

    avatar.objetivo = { x, y }
    this.animar(avatar, dir, anim)
  }

  animar(avatar, dir, anim) {
    if (ANIMACIONES[dir]) avatar.dir = dir
    const { clave, reposo } = ANIMACIONES[avatar.dir]

    if (anim === 'walk') {
      // true: si ya está sonando esta animación, no la reinicia
      avatar.sprite.anims.play(clave, true)
    } else {
      avatar.sprite.anims.stop()
      avatar.sprite.setFrame(reposo)
    }
  }

  // Se llama en cada frame desde update() de la escena.
  // `delta` son los milisegundos desde el frame anterior.
  update(delta) {
    // Suavizado que no depende de los fps: con 30 o con 144 fps se ve igual
    const factor = 1 - Math.exp(-delta / SUAVIZADO_MS)

    for (const { sprite, etiqueta, objetivo } of this.avatares.values()) {
      const dx = objetivo.x - sprite.x
      const dy = objetivo.y - sprite.y

      if (Math.hypot(dx, dy) > DISTANCIA_SALTO) {
        sprite.setPosition(objetivo.x, objetivo.y)
      } else {
        sprite.setPosition(sprite.x + dx * factor, sprite.y + dy * factor)
      }

      etiqueta.setPosition(sprite.x, sprite.y - 24)
    }
  }

  destruir() {
    if (this.destruido) return
    this.destruido = true

    bus.off('game:init', this.alIniciar)
    bus.off('remote:joined', this.alEntrar)
    bus.off('remote:left', this.alSalir)
    bus.off('remote:positions', this.alRecibirPosiciones)

    for (const id of [...this.avatares.keys()]) this.quitar(id)
  }
}
