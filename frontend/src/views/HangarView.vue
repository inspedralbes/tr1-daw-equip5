<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { socket } from '@/services/socket'
import { useUserStore } from '@/stores/user'
import { usePresenceStore } from '@/stores/presence'

const router = useRouter()
const user = useUserStore()
const presence = usePresenceStore()

const nombre = ref('')
const tocado = ref(false)
const enviando = ref(false)
const errorServidor = ref('')
const errorNave = ref('')

const nombreLimpio = computed(() => nombre.value.trim())

const error = computed(() => {
  if (nombreLimpio.value.length === 0) return 'Escribe un nombre para la nave'
  if (nombreLimpio.value.length < 3) return 'Mínimo 3 caracteres'
  if (nombreLimpio.value.length > 20) return 'Máximo 20 caracteres'
  if (!/^[\p{L}\d _-]+$/u.test(nombreLimpio.value)) return 'Solo letras, números, - y _'
  return ''
})

const esValido = computed(() => error.value === '')

// La nave en la que estoy, buscándome dentro de las listas de tripulantes.
// Así no hace falta guardar "en qué nave estoy" por otro lado: si estoy en
// alguna, aparezco en su lista de jugadores.
const miNave = computed(() =>
  presence.rooms.find((nave) => nave.jugadores.some((j) => j.id === user.id))
)

const miJugador = computed(() =>
  miNave.value?.jugadores.find((j) => j.id === user.id)
)

const soyCapitan = computed(() => miNave.value?.capitanId === user.id)

const todosListos = computed(() =>
  miNave.value ? miNave.value.jugadores.every((j) => j.ready) : false
)

// "Esperando" / "Llena" / "En misión": el servidor manda los datos en crudo
// (enMision, maxPlayers, jugadores) y aquí calculamos la etiqueta a mostrar.
function estadoNave(nave) {
  if (nave.enMision) return 'En misión'
  if (nave.jugadores.length >= nave.maxPlayers) return 'Llena'
  return 'Esperando'
}

function puedeUnirse(nave) {
  return !nave.enMision && nave.jugadores.length < nave.maxPlayers
}

function crearNave() {
  tocado.value = true
  errorServidor.value = ''
  if (!esValido.value || enviando.value) return

  if (!socket.connected) {
    errorServidor.value = 'No hay conexión con el servidor'
    return
  }

  enviando.value = true

  // timeout(5000): si el servidor no responde en 5 s, el callback recibe un error
  // mapId fijo: de momento solo existe el mapa "nave"
  socket
    .timeout(5000)
    .emit('lobby:create-room', { name: nombreLimpio.value, mapId: 'nave' }, (err, respuesta) => {
      enviando.value = false

      if (err) {
        errorServidor.value = 'El servidor no responde. Inténtalo de nuevo'
        return
      }
      if (!respuesta?.ok) {
        errorServidor.value = respuesta?.error?.message || 'No se ha podido crear la nave'
        return
      }

      // No navegamos a ningún sitio: me quedo en el hangar y el panel de mi
      // nave aparece solo, porque ya salgo en su lista de tripulantes.
      nombre.value = ''
      tocado.value = false
    })
}

function unirse(roomId) {
  errorNave.value = ''
  socket.emit('lobby:join-room', { roomId }, (respuesta) => {
    if (!respuesta?.ok) {
      errorNave.value = respuesta?.error?.message || 'No se ha podido unir a la nave'
    }
  })
}

function marcarListo() {
  socket.emit('lobby:ready', { ready: !miJugador.value?.ready })
}

function salirNave() {
  socket.emit('lobby:leave-room')
}

function despegar() {
  errorNave.value = ''
  socket.emit('lobby:start-game', {}, (respuesta) => {
    if (!respuesta?.ok) {
      errorNave.value = respuesta?.error?.message || 'No se ha podido despegar'
    }
    // si todo va bien, el servidor manda "lobby:game-started" y navegamos en el listener de abajo
  })
}

// Cuando el capitán despega, el servidor solo avisa a la tripulación de esa
// nave (socket.join de por medio), así que cualquiera que reciba esto va a /nave/:roomId
function irANave({ roomId }) {
  router.push(`/nave/${roomId}`)
}

onMounted(() => socket.on('lobby:game-started', irANave))
onUnmounted(() => socket.off('lobby:game-started', irANave))
</script>

<template>
  <main class="hangar">
    <header class="barra">
      <span class="punto" :style="{ background: user.color }"></span>
      <strong>{{ user.name }}</strong>
      <h1>HANGAR</h1>
    </header>

    <section class="columnas">
      <div class="panel">
        <h2>Naves disponibles</h2>
        <p v-if="presence.rooms.length === 0" class="vacio">
          Todavía no hay naves. ¡Crea la primera!
        </p>
        <ul>
          <li v-for="nave in presence.rooms" :key="nave.id" class="nave">
            <div>
              <strong>🚀 {{ nave.name }}</strong>
              <p class="detalle">
                Tripulantes {{ nave.jugadores.length }}/{{ nave.maxPlayers }} · {{ estadoNave(nave) }}
              </p>
            </div>
            <button
              type="button"
              :disabled="!puedeUnirse(nave) || miNave"
              @click="unirse(nave.id)"
            >
              Unirse
            </button>
          </li>
        </ul>
        <p v-if="errorNave" class="error">{{ errorNave }}</p>
      </div>

      <div class="panel">
        <h2>Conectados ({{ presence.users.length }})</h2>
        <ul>
          <li v-for="u in presence.users" :key="u.id">
            <span class="punto" :style="{ background: u.color }"></span>
            {{ u.name }}
            <em v-if="u.id === user.id">(tú)</em>
          </li>
        </ul>
      </div>
    </section>

    <section v-if="miNave" class="panel">
      <h2>🚀 {{ miNave.name }}</h2>
      <p>{{ miNave.enMision ? 'En misión' : 'Esperando…' }}</p>

      <ul>
        <li v-for="j in miNave.jugadores" :key="j.id">
          <span class="punto" :style="{ background: j.color }"></span>
          {{ j.name }}
          <em v-if="j.id === user.id">(tú)</em>
          <span v-if="j.id === miNave.capitanId">★</span>
          · {{ j.ready ? '✔ Listo' : 'No listo' }}
        </li>
        <li v-for="n in miNave.maxPlayers - miNave.jugadores.length" :key="'libre' + n" class="vacio">
          Plaza libre
        </li>
      </ul>

      <div class="acciones">
        <button type="button" @click="marcarListo">
          {{ miJugador?.ready ? 'No estoy listo' : 'Estoy listo' }}
        </button>
        <button type="button" @click="salirNave">Salir de la nave</button>
        <button v-if="soyCapitan" type="button" :disabled="!todosListos" @click="despegar">
          🚀 Despegar
        </button>
      </div>
    </section>

    <section v-else>
      <h2>Crear nave</h2>

      <form @submit.prevent="crearNave">
        <label for="nave">Nombre de la nave</label>
        <input id="nave" v-model="nombre" maxlength="20" @blur="tocado = true" />

        <p v-if="tocado && error" class="error">{{ error }}</p>
        <p v-if="errorServidor" class="error">{{ errorServidor }}</p>

        <button type="submit" :disabled="!esValido || enviando">
          {{ enviando ? 'Creando…' : 'Crear nave' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.columnas { display: flex; gap: 24px; }
.panel { flex: 1; border: 2px solid #333; border-radius: 8px; padding: 16px; }
.punto { display: inline-block; width: 14px; height: 14px; border-radius: 50%; margin-right: 8px; }
ul { list-style: none; padding: 0; }
li { padding: 6px 0; }
.vacio { color: #888; }
.nave { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.detalle { margin: 0; color: #888; font-size: 0.9em; }
.acciones { display: flex; gap: 12px; margin-top: 12px; }
.error {
  color: #d64545;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
