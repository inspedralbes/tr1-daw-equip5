const COLOR_ZONA = 0x10b981

function propiedades(objeto) {
  return (objeto.properties || []).reduce((acc, propiedad) => {
    acc[propiedad.name] = propiedad.value
    return acc
  }, {})
}

function extraerObjetos(map) {
  const capaObjetos = map.getObjectLayer('objetos')
  const objetos = capaObjetos ? capaObjetos.objects : []

  const zonas = []
  const consolas = []
  const intercoms = []
  let spawn = null

  for (const objeto of objetos) {
    const props = propiedades(objeto)

    if (objeto.type === 'room') {
      zonas.push({
        id: objeto.name,
        nombre: props.nombre ?? objeto.name,
        x: objeto.x,
        y: objeto.y,
        w: objeto.width,
        h: objeto.height,
      })
    } else if (objeto.type === 'console') {
      consolas.push({
        id: props.consoleId ?? objeto.name,
        roomZone: props.roomZone,
        x: objeto.x,
        y: objeto.y,
      })
    } else if (objeto.type === 'intercom') {
      intercoms.push({
        id: objeto.name,
        roomZone: props.roomZone,
        x: objeto.x,
        y: objeto.y,
      })
    } else if (objeto.type === 'spawn') {
      spawn = { x: objeto.x, y: objeto.y }
    }
  }

  return { zonas, consolas, intercoms, spawn }
}

function pintarDecoracionColeccion(scene, map) {
  const coleccion = map.imageCollections.find((c) => c.name === 'objetos-decor')
  if (!coleccion) return []

  const filas = map.getLayer('decoracion').data
  const imagenes = []

  for (const fila of filas) {
    for (const tile of fila) {
      if (tile.index < 0) continue

      const entrada = coleccion.images.find((imagen) => imagen.gid === tile.index)
      if (!entrada) continue

      const clave = entrada.image
        .split('/')
        .pop()
        .replace(/\.[^.]+$/, '')
      imagenes.push(scene.add.image(tile.pixelX, tile.pixelY, clave).setOrigin(0, 0))
    }
  }

  return imagenes
}

function etiquetarInteractivo(scene, sprite, etiqueta) {
  scene.add
    .text(sprite.x + 16, sprite.y - 6, etiqueta, { fontSize: '12px', color: '#fde68a' })
    .setOrigin(0.5)
}

function crearInteractivos(scene, consolas, intercoms) {
  for (const consola of consolas) {
    const sprite = scene.add.sprite(consola.x, consola.y, 'consola', 0).setOrigin(0, 0)
    sprite.setInteractive()
    sprite.setData('tipo', 'consola')
    sprite.setData('consoleId', consola.id)
    sprite.setData('roomZone', consola.roomZone)
    scene.physics?.add.existing(sprite, true)
    consola.sprite = sprite
    etiquetarInteractivo(scene, sprite, consola.id)
  }

  for (const intercom of intercoms) {
    const sprite = scene.add.sprite(intercom.x, intercom.y, 'boton-intercom', 0).setOrigin(0, 0)
    sprite.setInteractive()
    sprite.setData('tipo', 'intercom')
    sprite.setData('roomZone', intercom.roomZone)
    scene.physics?.add.existing(sprite, true)
    intercom.sprite = sprite
    etiquetarInteractivo(scene, sprite, intercom.id)
  }
}

function prepararAnimaciones(scene, map) {
  const tilesetsAnimables = [
    { tileset: 'consola', clave: 'consola-parpadeo' },
    { tileset: 'boton-intercom', clave: 'intercom-parpadeo' },
  ]

  for (const { tileset: nombre, clave } of tilesetsAnimables) {
    if (scene.anims.exists(clave)) continue

    const tileset = map.getTileset(nombre)
    const animacion = tileset?.getTileData(tileset.firstgid)?.animation
    if (!animacion) continue

    scene.anims.create({
      key: clave,
      frames: animacion.map((frame) => ({
        key: nombre,
        frame: frame.tileid,
        duration: frame.duration,
      })),
      repeat: -1,
    })
  }
}

function dibujarZonas(scene, zonas) {
  for (const zona of zonas) {
    const cx = zona.x + zona.w / 2
    const cy = zona.y + zona.h / 2

    scene.add.rectangle(cx, cy, zona.w, zona.h, COLOR_ZONA, 0.22).setStrokeStyle(2, COLOR_ZONA)
    scene.add.text(cx, cy, zona.nombre, { fontSize: '13px', color: '#a7f3d0' }).setOrigin(0.5)
  }
}

function dibujarSpawn(scene, spawn) {
  if (!spawn) return
  scene.add.circle(spawn.x, spawn.y, 14, COLOR_ZONA).setStrokeStyle(2, 0xffffff)
}

export function crearMapa(scene) {
  const map = scene.make.tilemap({ key: 'nave' })

  const tilesetNave = map.addTilesetImage('tileset-nave', 'tileset-nave')

  const suelo = map.createLayer('suelo', tilesetNave, 0, 0)
  const paredes = map.createLayer('paredes', tilesetNave, 0, 0)
  paredes.setCollisionByExclusion([-1])

  pintarDecoracionColeccion(scene, map)
  prepararAnimaciones(scene, map)

  const { zonas, consolas, intercoms, spawn } = extraerObjetos(map)
  crearInteractivos(scene, consolas, intercoms)
  dibujarZonas(scene, zonas)
  dibujarSpawn(scene, spawn)

  return {
    map,
    capas: { suelo, paredes },
    paredes,
    zonas,
    consolas,
    intercoms,
    spawn,
  }
}

export function zonaEn(zonas, x, y) {
  const zona = zonas.find((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h)
  return zona ? zona.id : null
}
