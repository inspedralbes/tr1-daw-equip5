# 🚀 Alerta Roja

Aplicación web multijugador en tiempo real. Sois la tripulación de una nave averiada: os movéis por un mapa 2D, os veis por **videollamada** y tenéis que reparar las averías antes de que se acabe el oxígeno.

**Equipo TR1:** Claudia · Ilia · Jordi · Kilian

---

## 📖 Índice

1. [Cómo se juega](#-cómo-se-juega)
2. [Tecnologías](#-tecnologías)
3. [Estructura del proyecto](#-estructura-del-proyecto)
4. [Instalación y ejecución](#-instalación-y-ejecución)
5. [Variables de entorno](#-variables-de-entorno)
6. [Documentación](#-documentación)
7. [Decisiones del proyecto](#-decisiones-del-proyecto)
8. [GitFlow](#-gitflow)
9. [Guía de commits](#-guía-de-commits)
10. [Pull requests](#-pull-requests)

---

## 🎮 Cómo se juega

1. Escribes tu nombre, eliges el color del traje y pruebas la cámara.
2. En el **hangar** creas una nave o te unes a una. Cuando todos están listos, el capitán despega.
3. En la **nave** van saltando averías en las salas y el oxígeno baja.
4. Quien está en la sala averiada ve el **panel** de reparación, pero el **manual** para resolverlo solo se puede leer en el **puente**. Os tenéis que coordinar:
   - por **vídeo**, con quien está en tu misma sala;
   - por el **intercomunicador**, para hablar entre salas.
5. **Ganáis** si aguantáis hasta el rescate. **Perdéis** si el oxígeno llega a 0.
6. Al final se muestra un **informe de misión** con los resultados.

---

## 🛠 Tecnologías

| Parte | Tecnología |
|---|---|
| Interfaz | Vue 3 (`<script setup>`), Vue Router, Pinia |
| Mapa 2D | Phaser 3 + Tiled |
| Tiempo real | Node.js + Socket.IO |
| Vídeo y audio | WebRTC (simple-peer) |
| Base de datos | SQLite |
| Despliegue | Docker, Docker Compose, Nginx, Caddy (HTTPS), coturn (TURN) |

---

## 📁 Estructura del proyecto

```
alerta-roja/
├── frontend/              # Aplicación Vue
│   ├── src/
│   │   ├── components/    # PlazaCanvas.vue, VideoPanel.vue, HUD...
│   │   ├── views/         # Entrada, Hangar, Nave, Informe
│   │   ├── stores/        # Pinia: user, presence, call, game
│   │   ├── game/          # Phaser: NaveScene.js, bus.js
│   │   └── services/      # socket.js
│   ├── Dockerfile
│   └── nginx.conf
├── backend/               # Servidor Node + Socket.IO
│   ├── src/
│   ├── data/              # Manuales de averías (JSON) y base de datos
│   └── Dockerfile
├── doc/                   # Documentación (diseño, arquitectura, protocolo)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ▶️ Instalación y ejecución

### Requisitos

- [Docker](https://www.docker.com/) y Docker Compose
- [Node.js](https://nodejs.org/) 20 o superior (solo para desarrollo sin Docker)

### Opción 1: con Docker (recomendada)

```bash
git clone <url-del-repositorio>
cd alerta-roja
cp .env.example .env        # y rellena los valores
docker compose up --build
```

Abre **http://localhost** en el navegador.

### Opción 2: en desarrollo, sin Docker

Abre dos terminales.

```bash
# Terminal 1: backend
cd backend
npm install
npm run dev
```

```bash
# Terminal 2: frontend
cd frontend
npm install
npm run dev
```

Abre la URL que te indique Vite (normalmente **http://localhost:5173**).

> ⚠️ El navegador solo deja usar la cámara en `localhost` o con **HTTPS**. Para probar desde otro ordenador hace falta HTTPS.

### Probar con varios jugadores

Abre varias pestañas (o una ventana de incógnito) en el mismo ordenador. Cada pestaña es un jugador.

---

## 🔐 Variables de entorno

Copia `.env.example` a `.env` y rellénalo. **El fichero `.env` nunca se sube al repositorio.**

| Variable | Para qué sirve | Ejemplo |
|---|---|---|
| `BACKEND_PORT` | Puerto del servidor Node | `3000` |
| `CORS_ORIGIN` | Desde qué URL se permite conectar al servidor | `http://localhost` |
| `VITE_SOCKET_URL` | URL del servidor para el frontend | `http://localhost:3000` |
| `DB_PATH` | Ruta del fichero SQLite | `./data/alerta-roja.db` |
| `TURN_URL` | Dirección del servidor TURN | `turn:localhost:3478` |
| `TURN_USER` | Usuario del TURN | `alerta` |
| `TURN_PASS` | Contraseña del TURN | `cambiar-esto` |
| `DOMAIN` | Dominio para HTTPS (producción) | `alerta-roja.ejemplo.com` |

---

## 📚 Documentación

| Documento | Contenido |
|---|---|
| [Diseño UX/UI](ux/README.md) | Flujo de usuario, wireframes y mapa de la nave |
| [Bus Vue ↔ Phaser](arquitectura/bus-vue-phaser.md) | Cómo se comunican Vue y Phaser |
| [Protocolo de comunicación](protocol.md) | Eventos de Socket.IO y señalización WebRTC |
| [Taiga](https://tree.taiga.io/project/kiliangp-tr1) | Backlog, sprints y tareas |

---

## 💡 Decisiones del proyecto

- **Vue Router en vez de `v-if`:** cada vista tiene su propia URL (`/`, `/hangar`, `/nave/:id`, `/informe`), el botón "atrás" funciona y podemos impedir entrar en la nave sin haber puesto nombre. Además, al salir de la nave el componente del juego se destruye solo.
- **El servidor decide en qué sala está cada jugador:** así todos ven lo mismo y nadie puede hacer trampas, por ejemplo ver el panel de una sala sin estar dentro.
- **Posiciones cada 100 ms:** no enviamos cada píxel de movimiento, para no saturar la red.
- **Vídeo entre navegadores:** el vídeo no pasa por nuestro servidor. El servidor solo ayuda a que dos navegadores se conecten.

---

## 🌳 GitFlow

### Ramas

| Rama | Para qué sirve | ¿Se puede hacer push directo? |
|---|---|---|
| `main` | Código que está en producción (versión entregada) | ❌ No, solo con PR desde `dev` |
| `dev` | Código en desarrollo, donde se juntan las funcionalidades | ❌ No, solo con PR |
| `feature/...` | Una rama por cada funcionalidad | ✅ Sí, es tu rama de trabajo |
| `fix/...` | Arreglar un error | ✅ Sí |

### Nombres de las ramas

Usad el número de la historia de Taiga y una descripción corta en minúsculas con guiones:

```
feature/18-docker-compose
feature/30-vista-entrada
fix/66-avatar-no-desaparece
```

### Pasos para trabajar en una funcionalidad

```bash
# 1. Ponerte al día con dev
git checkout dev
git pull

# 2. Crear tu rama
git checkout -b feature/30-vista-entrada

# 3. Trabajar y hacer commits
git add .
git commit -m "feat(frontend): añade formulario de nombre en la vista de entrada"

# 4. Subir tu rama
git push -u origin feature/30-vista-entrada

# 5. Abrir una Pull Request en GitHub hacia dev
```

### Antes de abrir la PR: actualiza tu rama

Si `dev` ha cambiado mientras trabajabas:

```bash
git checkout dev
git pull
git checkout feature/30-vista-entrada
git merge dev
# Si hay conflictos, resuélvelos, haz commit y vuelve a subir
git push
```

### Pasar a producción (final de sprint)

Al final de cada sprint, cuando `dev` funciona bien, se hace una PR de `dev` a `main` y se marca la versión:

```bash
git checkout main
git pull
git tag v1.0-sprint1
git push --tags
```

---

## ✍️ Guía de commits

Cada commit tiene que explicar **qué cambia y por qué**. Mensajes como `cambios`, `fix` o `asdf` **no se aceptan**.

### Formato

```
tipo(parte): descripción corta en presente
```

### Tipos

| Tipo | Cuándo usarlo |
|---|---|
| `feat` | Añades algo nuevo |
| `fix` | Arreglas un error |
| `docs` | Cambias documentación |
| `style` | Cambios de formato o CSS que no cambian el funcionamiento |
| `refactor` | Reorganizas código sin cambiar lo que hace |
| `test` | Añades o cambias pruebas |
| `chore` | Configuración, dependencias, Docker... |

### Partes

`frontend`, `backend`, `phaser`, `webrtc`, `docker`, `docs`

### Ejemplos

✅ **Bien**

```
feat(backend): envía las posiciones de los jugadores cada 100 ms
fix(phaser): elimina el avatar cuando un jugador se desconecta
docs: añade el protocolo de eventos de la partida
chore(docker): añade el servicio coturn al docker-compose
feat(frontend): permite entrar sin cámara si se deniega el permiso
```

❌ **Mal**

```
cambios
fix
arreglado
asdf
cosas del lobby
```

### Consejos

- **Un commit = un cambio.** Mejor varios commits pequeños que uno enorme.
- Descripción **corta** (máximo unos 70 caracteres).
- Si hace falta explicar más, deja una línea en blanco y escríbelo debajo:

  ```
  fix(webrtc): evita que los dos jugadores envíen la oferta a la vez

  Ahora el servidor decide quién inicia la llamada con el campo initiator.
  ```

- Si el commit es de una historia de Taiga, puedes añadir su número al final, por ejemplo `TG-30`.

---

## 🔀 Pull requests

1. Toda funcionalidad entra en `dev` **mediante una PR**.
2. La PR la tiene que **revisar y aprobar al menos otro miembro** del equipo.
3. El título de la PR sigue el mismo formato que los commits.
4. En la descripción explica:
   - **Qué** has hecho
   - **Cómo** probarlo
   - **Historia de Taiga** relacionada (por ejemplo, `#30`)
5. Antes de pedir revisión, comprueba que el proyecto arranca con `docker compose up`.
6. Cuando la PR se aprueba se hace el merge y **se borra la rama**.

### Plantilla de PR

```markdown
## Qué hace esta PR
-

## Cómo probarlo
1.

## Historia de Taiga
#

## Checklist
- [ ] Arranca con docker compose up
- [ ] He probado con al menos 2 pestañas
- [ ] He actualizado la documentación si hacía falta
```
