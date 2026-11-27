#!/usr/bin/env python3
"""Genera nave.tmx + nave.json (formato Tiled) a partir de una definicion
declarativa de salas. Se ejecuta a mano cada vez que cambia el diseno del
mapa; los ficheros .tmx/.json generados son los que se versionan y se cargan
desde Phaser / el servidor."""
import json
import xml.sax.saxutils as sx

TILE = 32
MAP_W, MAP_H = 40, 25

# --- GIDs de los tilesets externos -----------------------------------------
# tileset-nave.tsx: 20 tiles (4 cols x 5 filas), firstgid=1
TS_NAVE = 1
W_TOP, W_CORNER_TL, W_SIDE, W_TOP_ALT = TS_NAVE + 0, TS_NAVE + 1, TS_NAVE + 2, TS_NAVE + 3
W_CORNER_TR = TS_NAVE + 4
W_PLATE = TS_NAVE + 10
FLOOR_PLAIN, FLOOR_GRID = TS_NAVE + 18, TS_NAVE + 19

# consola.tsx: 2 tiles (frame apagado/parpadeo), firstgid=21
TS_CONSOLA = 21
CONSOLA = TS_CONSOLA + 0

# boton-intercom.tsx: 2 tiles, firstgid=23
TS_BOTON = 23
BOTON_INTERCOM = TS_BOTON + 0

# objetos-decor.tsx: coleccion de imagenes, firstgid=25
TS_DECOR = 25
SERVIDOR, RACK, REJILLA, FRANJA, EXTINTOR, SENAL_RAD, SENAL_PELIGRO, PANEL = range(TS_DECOR, TS_DECOR + 8)

FLIP_H = 0x80000000
FLIP_V = 0x40000000

# --- Definicion de salas -----------------------------------------------------
# (x1,y1)-(x2,y2) en tiles, inclusive. door_side: 'south' (abre al pasillo
# hacia abajo) o 'north' (abre hacia arriba). door_x: columnas de la puerta.
ROOMS = {
    "reactor":          dict(x1=1,  y1=1,  x2=11, y2=8,  door_side="south", door_x=(5, 7),   nombre="Reactor"),
    "puente":           dict(x1=13, y1=1,  x2=25, y2=8,  door_side="south", door_x=(18, 20), nombre="Puente"),
    "soporte-vital":    dict(x1=27, y1=1,  x2=38, y2=8,  door_side="south", door_x=(32, 34), nombre="Soporte vital"),
    "motores":          dict(x1=1,  y1=16, x2=11, y2=23, door_side="north", door_x=(5, 7),   nombre="Motores"),
    "comunicaciones":   dict(x1=13, y1=16, x2=25, y2=23, door_side="north", door_x=(18, 20), nombre="Comunicaciones"),
    "enfermeria":       dict(x1=27, y1=16, x2=38, y2=23, door_side="north", door_x=(32, 34), nombre="Enfermeria"),
}
SEPARATOR_COLS = [12, 26]  # mamparos entre salas, solidos solo junto a las salas

def new_grid(fill=0):
    return [[fill for _ in range(MAP_W)] for _ in range(MAP_H)]

suelo = new_grid(FLOOR_PLAIN)
paredes = new_grid(0)
decor = new_grid(0)

def set_wall(x, y, gid):
    paredes[y][x] = gid

def set_floor(x, y, gid):
    suelo[y][x] = gid

def set_decor(x, y, gid):
    decor[y][x] = gid

def build_room_walls(r):
    x1, y1, x2, y2 = r["x1"], r["y1"], r["x2"], r["y2"]
    door_x1, door_x2 = r["door_x"]

    # fila superior (y1): sin flip
    for x in range(x1, x2 + 1):
        if r["door_side"] == "north" and door_x1 <= x <= door_x2:
            continue
        if x == x1:
            set_wall(x, y1, W_CORNER_TL)
        elif x == x2:
            set_wall(x, y1, W_CORNER_TR)
        else:
            set_wall(x, y1, W_TOP)

    # fila inferior (y2): con flip vertical (misma pieza, mamparo espejado)
    for x in range(x1, x2 + 1):
        if r["door_side"] == "south" and door_x1 <= x <= door_x2:
            continue
        if x == x1:
            set_wall(x, y2, W_CORNER_TL | FLIP_V)
        elif x == x2:
            set_wall(x, y2, W_CORNER_TR | FLIP_V)
        else:
            set_wall(x, y2, W_TOP | FLIP_V)

    # laterales
    for y in range(y1 + 1, y2):
        set_wall(x1, y, W_SIDE)
        set_wall(x2, y, W_SIDE | FLIP_H)

for r in ROOMS.values():
    build_room_walls(r)

# mamparos separadores entre columnas de salas (solo junto a las salas, no en el pasillo)
for col in SEPARATOR_COLS:
    for y in list(range(1, 9)) + list(range(16, 24)):
        set_wall(col, y, W_SIDE)

# casco exterior del mapa
for x in range(MAP_W):
    set_wall(x, 0, W_TOP if 0 < x < MAP_W - 1 else (W_CORNER_TL if x == 0 else W_CORNER_TR))
    bottom_gid = W_TOP | FLIP_V
    if x == 0:
        bottom_gid = W_CORNER_TL | FLIP_V
    elif x == MAP_W - 1:
        bottom_gid = W_CORNER_TR | FLIP_V
    set_wall(x, MAP_H - 1, bottom_gid)
for y in range(MAP_H):
    if paredes[y][0] == 0:
        set_wall(0, y, W_SIDE)
    if paredes[y][MAP_W - 1] == 0:
        set_wall(MAP_W - 1, y, W_SIDE | FLIP_H)

# --- Decoracion por sala ------------------------------------------------------
def decor_oversize(x, y, gid, width_tiles):
    """Coloca un decorado mas ancho que un tile; las celdas siguientes se dejan
    vacias porque Tiled/Phaser dibujan la imagen completa desde esa celda."""
    set_decor(x, y, gid)

# Reactor
set_floor(6, 3, FLOOR_GRID)
set_decor(6, 3, CONSOLA)
decor_oversize(3, 2, SERVIDOR, 2)
set_decor(5, 2, SENAL_RAD)
set_decor(7, 3, SENAL_PELIGRO)
set_decor(9, 2, RACK)
set_decor(2, 6, EXTINTOR)
for x in range(5, 8):
    set_decor(x, 8, FRANJA)

# Puente
set_floor(19, 3, FLOOR_GRID)
set_decor(19, 3, BOTON_INTERCOM)
set_decor(15, 2, PANEL)
set_decor(23, 2, PANEL)
set_decor(15, 6, RACK)
set_decor(23, 6, RACK)

# Soporte vital
set_floor(32, 3, FLOOR_GRID)
set_decor(32, 3, CONSOLA)
decor_oversize(29, 2, REJILLA, 3)
set_decor(36, 2, RACK)
set_decor(34, 3, SENAL_PELIGRO)
set_decor(29, 6, EXTINTOR)
for x in range(32, 35):
    set_decor(x, 8, FRANJA)

# Motores
set_floor(6, 20, FLOOR_GRID)
set_decor(6, 20, CONSOLA)
decor_oversize(3, 22, SERVIDOR, 2)
set_decor(7, 20, SENAL_PELIGRO)
set_decor(9, 21, RACK)
set_decor(2, 17, EXTINTOR)
for x in range(5, 8):
    set_decor(x, 16, FRANJA)

# Comunicaciones
set_floor(19, 20, FLOOR_GRID)
set_decor(19, 20, BOTON_INTERCOM)
set_decor(15, 21, PANEL)
set_decor(23, 21, PANEL)
set_decor(15, 18, RACK)
set_decor(23, 18, RACK)

# Enfermeria (sala de spawn, sin averia: decoracion minima)
set_decor(29, 18, RACK)
set_decor(36, 18, EXTINTOR)

# Pasillo central: un par de detalles junto al casco
set_decor(2, 12, EXTINTOR)
set_decor(37, 12, EXTINTOR)

SPAWN_TILE = (33, 20)

# --- Objetos (zonas, consolas, spawn) -----------------------------------------
objects = []
next_id = 1

def add_object(**kw):
    global next_id
    obj = {"id": next_id, **kw}
    next_id += 1
    objects.append(obj)
    return obj["id"]

for key, r in ROOMS.items():
    add_object(
        name=key, type="room",
        x=r["x1"] * TILE, y=r["y1"] * TILE,
        width=(r["x2"] - r["x1"] + 1) * TILE, height=(r["y2"] - r["y1"] + 1) * TILE,
        properties=[{"name": "nombre", "type": "string", "value": r["nombre"]}],
    )

for key in ("puente", "comunicaciones"):
    r = ROOMS[key]
    cx = (r["x1"] + r["x2"]) // 2
    add_object(
        name=f"intercom-{key}", type="intercom",
        x=cx * TILE, y=(r["y1"] + 2) * TILE, width=TILE, height=TILE,
        properties=[{"name": "roomZone", "type": "string", "value": key}],
    )

CONSOLE_POS = {
    "reactor": (6, 3), "soporte-vital": (32, 3), "motores": (6, 20),
}
for key, (cx, cy) in CONSOLE_POS.items():
    add_object(
        name=f"consola-{key}", type="console",
        x=cx * TILE, y=cy * TILE, width=TILE, height=TILE,
        properties=[
            {"name": "consoleId", "type": "string", "value": f"consola-{key}"},
            {"name": "roomZone", "type": "string", "value": key},
        ],
    )

add_object(
    name="spawn", type="spawn",
    x=SPAWN_TILE[0] * TILE + TILE // 2, y=SPAWN_TILE[1] * TILE + TILE // 2,
    width=0, height=0, point=True,
)

# --- Emision TMX ---------------------------------------------------------------
def csv_layer(grid):
    rows = [",".join(str(v) for v in row) for row in grid]
    return ",\n".join(rows)

def obj_xml(o):
    attrs = f' id="{o["id"]}" name="{sx.quoteattr(o["name"])[1:-1]}" type="{o["type"]}"'
    attrs += f' x="{o["x"]}" y="{o["y"]}"'
    if not o.get("point"):
        attrs += f' width="{o["width"]}" height="{o["height"]}"'
    body = ""
    if o.get("point"):
        body += "<point/>"
    props = o.get("properties")
    if props:
        body += "<properties>" + "".join(
            f'<property name="{p["name"]}" value="{sx.quoteattr(p["value"])[1:-1]}"/>' for p in props
        ) + "</properties>"
    if body:
        return f"  <object{attrs}>{body}</object>"
    return f"  <object{attrs}/>"

TILESETS_TMX = f"""<tileset firstgid="{TS_NAVE}" name="tileset-nave" tilewidth="32" tileheight="32" tilecount="20" columns="4">
  <image source="../tiles/tileset-nave.png" width="128" height="160"/>
 </tileset>
 <tileset firstgid="{TS_CONSOLA}" name="consola" tilewidth="32" tileheight="32" tilecount="2" columns="2">
  <image source="../objetos/consola.png" width="64" height="32"/>
  <tile id="0">
   <animation>
    <frame tileid="0" duration="500"/>
    <frame tileid="1" duration="500"/>
   </animation>
  </tile>
 </tileset>
 <tileset firstgid="{TS_BOTON}" name="boton-intercom" tilewidth="32" tileheight="32" tilecount="2" columns="2">
  <image source="../objetos/boton-intercom.png" width="64" height="32"/>
  <tile id="0">
   <animation>
    <frame tileid="0" duration="2000"/>
    <frame tileid="1" duration="150"/>
   </animation>
  </tile>
 </tileset>
 <tileset firstgid="{TS_DECOR}" name="objetos-decor" tilewidth="32" tileheight="32" tilecount="8" columns="0">
  <grid orientation="orthogonal" width="1" height="1"/>
  <tile id="0"><image width="64" height="32" source="../objetos/servidor.png"/></tile>
  <tile id="1"><image width="32" height="32" source="../objetos/rack.png"/></tile>
  <tile id="2"><image width="96" height="32" source="../objetos/rejilla-ventilacion.png"/></tile>
  <tile id="3"><image width="32" height="32" source="../objetos/franja-peligro.png"/></tile>
  <tile id="4"><image width="32" height="32" source="../objetos/extintor.png"/></tile>
  <tile id="5"><image width="32" height="32" source="../objetos/senal-radiacion.png"/></tile>
  <tile id="6"><image width="32" height="32" source="../objetos/senal-peligro.png"/></tile>
  <tile id="7"><image width="32" height="32" source="../objetos/panel-energia.png"/></tile>
 </tileset>"""

tmx = f"""<?xml version="1.0" encoding="UTF-8"?>
<map version="1.10" tiledversion="1.11.0" orientation="orthogonal" renderorder="right-down" width="{MAP_W}" height="{MAP_H}" tilewidth="{TILE}" tileheight="{TILE}" infinite="0" nextlayerid="5" nextobjectid="{next_id}">
 {TILESETS_TMX}
 <layer id="1" name="suelo" width="{MAP_W}" height="{MAP_H}">
  <data encoding="csv">
{csv_layer(suelo)}
</data>
 </layer>
 <layer id="2" name="paredes" width="{MAP_W}" height="{MAP_H}">
  <properties>
   <property name="colisiona" type="bool" value="true"/>
  </properties>
  <data encoding="csv">
{csv_layer(paredes)}
</data>
 </layer>
 <layer id="3" name="decoracion" width="{MAP_W}" height="{MAP_H}">
  <data encoding="csv">
{csv_layer(decor)}
</data>
 </layer>
 <objectgroup id="4" name="objetos">
{chr(10).join(obj_xml(o) for o in objects)}
 </objectgroup>
</map>
"""

with open("nave.tmx", "w", encoding="utf-8") as f:
    f.write(tmx)

# --- Emision JSON (formato Tiled, consumible directamente por Phaser) --------
def flat(grid):
    out = []
    for row in grid:
        out.extend(row)
    return out

tiled_json = {
    "compressionlevel": -1,
    "width": MAP_W, "height": MAP_H,
    "tilewidth": TILE, "tileheight": TILE,
    "orientation": "orthogonal", "renderorder": "right-down",
    "type": "map", "version": "1.10", "tiledversion": "1.11.0",
    "infinite": False, "nextlayerid": 5, "nextobjectid": next_id,
    "tilesets": [
        {
            "firstgid": TS_NAVE, "name": "tileset-nave",
            "tilewidth": 32, "tileheight": 32, "tilecount": 20, "columns": 4,
            "image": "../tiles/tileset-nave.png", "imagewidth": 128, "imageheight": 160,
            "margin": 0, "spacing": 0,
        },
        {
            "firstgid": TS_CONSOLA, "name": "consola",
            "tilewidth": 32, "tileheight": 32, "tilecount": 2, "columns": 2,
            "image": "../objetos/consola.png", "imagewidth": 64, "imageheight": 32,
            "margin": 0, "spacing": 0,
            "tiles": [{"id": 0, "animation": [{"tileid": 0, "duration": 500}, {"tileid": 1, "duration": 500}]}],
        },
        {
            "firstgid": TS_BOTON, "name": "boton-intercom",
            "tilewidth": 32, "tileheight": 32, "tilecount": 2, "columns": 2,
            "image": "../objetos/boton-intercom.png", "imagewidth": 64, "imageheight": 32,
            "margin": 0, "spacing": 0,
            "tiles": [{"id": 0, "animation": [{"tileid": 0, "duration": 2000}, {"tileid": 1, "duration": 150}]}],
        },
        {
            "firstgid": TS_DECOR, "name": "objetos-decor",
            "tilewidth": 32, "tileheight": 32, "tilecount": 8, "columns": 0,
            "tiles": [
                {"id": 0, "image": "../objetos/servidor.png", "imagewidth": 64, "imageheight": 32},
                {"id": 1, "image": "../objetos/rack.png", "imagewidth": 32, "imageheight": 32},
                {"id": 2, "image": "../objetos/rejilla-ventilacion.png", "imagewidth": 96, "imageheight": 32},
                {"id": 3, "image": "../objetos/franja-peligro.png", "imagewidth": 32, "imageheight": 32},
                {"id": 4, "image": "../objetos/extintor.png", "imagewidth": 32, "imageheight": 32},
                {"id": 5, "image": "../objetos/senal-radiacion.png", "imagewidth": 32, "imageheight": 32},
                {"id": 6, "image": "../objetos/senal-peligro.png", "imagewidth": 32, "imageheight": 32},
                {"id": 7, "image": "../objetos/panel-energia.png", "imagewidth": 32, "imageheight": 32},
            ],
        },
    ],
    "layers": [
        {"id": 1, "name": "suelo", "type": "tilelayer", "width": MAP_W, "height": MAP_H,
         "x": 0, "y": 0, "opacity": 1, "visible": True, "data": flat(suelo)},
        {"id": 2, "name": "paredes", "type": "tilelayer", "width": MAP_W, "height": MAP_H,
         "x": 0, "y": 0, "opacity": 1, "visible": True, "data": flat(paredes),
         "properties": [{"name": "colisiona", "type": "bool", "value": True}]},
        {"id": 3, "name": "decoracion", "type": "tilelayer", "width": MAP_W, "height": MAP_H,
         "x": 0, "y": 0, "opacity": 1, "visible": True, "data": flat(decor)},
        {"id": 4, "name": "objetos", "type": "objectgroup", "x": 0, "y": 0,
         "opacity": 1, "visible": True, "draworder": "topdown",
         "objects": [
             {
                 "id": o["id"], "name": o["name"], "type": o["type"],
                 "x": o["x"], "y": o["y"],
                 "width": o.get("width", 0), "height": o.get("height", 0),
                 "point": o.get("point", False), "visible": True, "rotation": 0,
                 **({"properties": [
                        {"name": p["name"], "type": p.get("type", "string"), "value": p["value"]}
                        for p in o["properties"]
                    ]} if o.get("properties") else {}),
             }
             for o in objects
         ]},
    ],
}

with open("nave.json", "w", encoding="utf-8") as f:
    json.dump(tiled_json, f, ensure_ascii=False, indent=1)

print("OK: nave.tmx + nave.json generados")
print("spawn tile:", SPAWN_TILE, "-> px", (SPAWN_TILE[0]*TILE+TILE//2, SPAWN_TILE[1]*TILE+TILE//2))
