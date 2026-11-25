# Bomb Station: aplicació de les tecnologies al joc

Projecte Pixel Plaza · Barreja d'Among Us i Keep Talking and Nobody Explodes

## Concepte base

Bomb Station és una estació espacial en 2D amb diverses sales. Hi ha una bomba que es desactiva resolent mòduls, però les instruccions (el manual) estan repartides en pàgines que només veuen jugadors concrets. Un jugador, l'impostor, intenta que la bomba exploti.

Això justifica el mapa i el vídeo: per resoldre un mòdul cal anar físicament a parlar amb qui té la pàgina, i la videotrucada només s'obre quan sou a prop.

## Com s'aplica cada tecnologia

### Vue 3 + Pinia (interfície i estat global)

- **Vistes:** login i elecció d'avatar, lobby de sala, partida, pantalla de final (victòria/derrota).
- **Components d'UI sobre el mapa:** panell de vídeo amb les càmeres de qui tens a prop, xat, temporitzador de la bomba, llista de tasques i botó de reunió d'emergència.
- **Mòduls i manual com a modals:** el mòdul de la bomba (cables, botons, símbols) i les pàgines del manual són components Vue que s'obren com a modals. Així el mapa de Phaser no ha de dibuixar formularis.
- **Stores de Pinia:**
  - `useGameStore`: fase, temporitzador, rol, mòduls resolts.
  - `usePlayersStore`: jugadors i posicions.
  - `useCallStore`: peers i streams actius.
  - `useChatStore`: missatges de xat.

### Phaser 3 (espai 2D)

- **Mapa de l'estació (Tiled)** amb sales: sala de la bomba, biblioteca/arxiu (manual), laboratori, reactor i cafeteria.
- **Avatars animats** amb moviment i col·lisions amb les parets.
- **Zones amb significat:** zona del mòdul de bomba (obre el modal), zona del manual (obre una pàgina), zona de reunió i radi de proximitat al voltant de cada avatar per activar el vídeo.
- **Objectes interactius:** terminal de la bomba, prestatges amb pàgines, vents o panells que l'impostor fa servir per sabotejar.

### Socket.IO (temps real)

- **Esdeveniments de sala:** `room:join`, `room:leave`, `game:start`.
- **Moviment:** `player:move` (client) i `players:state` (servidor, difós a \~10-20 Hz).
- **Proximitat i xat:** `proximity:update`, `chat:message`.
- **Joc:** `module:open`, `module:action`, `module:result`, `bomb:tick`, `bomb:exploded`, `bomb:defused`.
- **Impostor:** `sabotage:trigger`, `meeting:call`, `vote:cast`.
- **Senyalització WebRTC:** `webrtc:offer`, `webrtc:answer`, `webrtc:ice`.

**Servidor autoritatiu:** l'estat de la bomba, el rol de l'impostor i quina pàgina del manual té cada jugador només els coneix el servidor. Cada client rep únicament el que és seu (`player:role`, `manual:page`). Així ningú pot fer trampes inspeccionant el client.

### WebRTC (vídeo i àudio)

- Quan el servidor detecta que dos jugadors entren en radi de proximitat (o a la mateixa sala), avisa tots dos i s'estableix la trucada: un envia `offer`, l'altre `answer`, i tots dos intercanvien candidats ICE a través de Socket.IO.
- En allunyar-se, es tanca la connexió. Es pot fer servir simple-peer per simplificar el codi.
- **Mecànica de joc sobre el vídeo:** qui desactiva veu la bomba i qui té el manual veu les instruccions, però cap dels dos veu el que té l'altre, així que han de descriure's les coses parlant. L'impostor pot mentir, i això és el que dona el to d'Among Us.
- **Reunions d'emergència:** obren una trucada de grup, on es debat i es vota.

### Docker + Docker Compose (desplegament)

- Servei `frontend`: build de Vue servit amb nginx.
- Servei `backend`: Node.js + Socket.IO.
- Servei `coturn`: servidor TURN/STUN, necessari perquè WebRTC funcioni darrere de NAT.
- Opcional: `db` (SQLite/MySQL) si s'afegeix persistència o estadístiques.
- Xarxa interna de Compose, variables d'entorn a `.env` i un únic `docker compose up` per aixecar-ho tot.

## Integració Vue ↔ Phaser

Es fa servir un **bus d'esdeveniments** (mitt) juntament amb Pinia:

- **Phaser → Vue:** emet `zone:enter`, `zone:exit` i `interact:terminal`. Vue obre el modal corresponent.
- **Vue → Phaser:** Pinia exposa l'estat (llista de jugadors, rol, sabotatges). L'escena de Phaser l'observa per pintar avatars, llums vermelles o portes bloquejades.
- **Socket.IO:** es gestiona en un servei a part que actualitza Pinia, i Phaser hi llegeix.

## Proposta per a l'enunciat

| Sprint | MVP |
| --- | --- |
| 1 | Login, triar avatar, sala compartida, moviment en temps real |
| 2 | Proximitat + videotrucada WebRTC + xat + Docker amb TURN |
| 3 | Bomba amb mòduls, manual repartit, impostor, sabotatges, reunió i votació |

**Stretch goal:** sales múltiples o reconnexió en 30 s.
