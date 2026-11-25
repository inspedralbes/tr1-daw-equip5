# Mapa de la nave · Tiled

- **`nave.tmx`** — fichero fuente, para abrir/editar con [Tiled](https://www.mapeditor.org/). Tilesets **embebidos** (no hay `.tsx` externos): solo depende de las imágenes en `../tiles/` y `../objetos/`.
- **`nave.json`** — export en formato Tiled JSON, pensado para cargar directamente en Phaser (`this.load.tilemapTiledJSON('nave', 'assets/maps/nave.json')`). Tilesets también embebidos.
- **`generar_mapa.py`** — script que genera ambos ficheros a partir de una definición declarativa de salas (tamaño, puertas, decoración). Para modificar el mapa, edita este script y vuelve a ejecutarlo (`python3 generar_mapa.py`) en vez de tocar el `.tmx`/`.json` a mano.

## Tamaño y proporción

40×25 tiles de 32 px → **1280×800 px** (ratio 8:5), igual que el boceto de `doc/ux/mapa-nave.svg`.

## Capas

| Capa | Tipo | Contenido |
|---|---|---|
| `suelo` | tile layer | suelo liso + acentos de rejilla bajo consolas/intercoms |
| `paredes` | tile layer | muros del casco y de las 6 salas. Propiedad `colisiona=true`: en Phaser, cualquier tile no vacío de esta capa debe colisionar (`layer.setCollisionByExclusion([-1])` o `[0]` según el índice vacío que uses al cargarla). |
| `decoracion` | tile layer | consolas, intercom, servidores, rejillas, señales, extintores, racks, franjas de peligro |
| `objetos` | object layer | `zones` (type=`room`/`intercom`), `consoles` (type=`console`, con `consoleId`+`roomZone`) y el punto `spawn` |

## IDs de zona (`roomZone`)

`reactor`, `puente`, `soporte-vital`, `motores`, `comunicaciones`, `enfermeria` — mismos IDs que debe usar el servidor para calcular en qué sala está cada jugador (coinciden con el `name` de cada objeto `type=room`).

## Consolas de avería

`consola-reactor`, `consola-soporte-vital`, `consola-motores` (Puente y Comunicaciones no tienen consola de reparación; Enfermería tampoco, es la sala de spawn sin avería).

## Spawn

Objeto `type=spawn` en Enfermería, tile (33, 20) → píxel (1072, 656).
