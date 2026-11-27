import Phaser from 'phaser'

import { bus } from './bus'
import { crearMapa } from './mapa'

import AvataresRemotos from './AvataresRemotos'
import JugadorLocal from './JugadorLocal'

export default class NaveScene extends Phaser.Scene {
  constructor() {
    super('Nave')
  }

  preload() {
    this.load.tilemapTiledJSON('nave', '/assets/maps/nave.json')

    this.load.image('tileset-nave', '/assets/tiles/tileset-nave.png')
    this.load.spritesheet('consola', '/assets/objetos/consola.png', {
      frameWidth: 32,
      frameHeight: 32,
    })
    this.load.spritesheet('boton-intercom', '/assets/objetos/boton-intercom.png', {
      frameWidth: 32,
      frameHeight: 32,
    })

    this.load.spritesheet('astronauta', '/assets/personajes/astronauta.png', {
      frameWidth: 32,
      frameHeight: 32,
    })

    this.load.image('servidor', '/assets/objetos/servidor.png')
    this.load.image('rack', '/assets/objetos/rack.png')
    this.load.image('rejilla-ventilacion', '/assets/objetos/rejilla-ventilacion.png')
    this.load.image('franja-peligro', '/assets/objetos/franja-peligro.png')
    this.load.image('extintor', '/assets/objetos/extintor.png')
    this.load.image('senal-radiacion', '/assets/objetos/senal-radiacion.png')
    this.load.image('senal-peligro', '/assets/objetos/senal-peligro.png')
    this.load.image('panel-energia', '/assets/objetos/panel-energia.png')
  }

  create() {
    // Ahora también recogemos paredes, spawn y map (crearMapa ya los devolvía)
    const { zonas, consolas, intercoms, paredes, spawn, map } = crearMapa(this)

    const elementos = [
      ...zonas.map((zona) => ({ tipo: 'Zona', nombre: zona.nombre, jugadores: 0 })),
      ...consolas.map((consola) => ({ tipo: 'Consola', nombre: consola.id })),
      ...intercoms.map((intercom) => ({ tipo: 'Intercom', nombre: intercom.id })),
    ]

    bus.emit('mapa:elementos', elementos)

    this.remotos = new AvataresRemotos(this)

    // ---------- #58: mi astronauta ----------
    // Si el mapa no tuviera spawn, aparecería en el centro
    const inicio = spawn ?? { x: map.widthInPixels / 2, y: map.heightInPixels / 2 }
    this.jugador = new JugadorLocal(this, { x: inicio.x, y: inicio.y, paredes })

    // Siempre lo último: avisa a Vue de que ya puede mandar 'player:init'
    bus.emit('scene:ready')
  }

  update(time, delta) {
    this.jugador.update()
    this.remotos.update(delta)
  }
}
