<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits(['listo', 'denegado'])

const videoEl = ref(null)
const estado = ref('cargando')
const tieneVideo = ref(false)
const tieneAudio = ref(false)
const micActivo = ref(true)
const camActiva = ref(true)

let stream = null
let montado = true


const ESTADO_POR_ERROR = {
  NotAllowedError: 'denegado', 
  SecurityError: 'denegado',
  NotFoundError: 'sin-dispositivos', 
  OverconstrainedError: 'sin-dispositivos',
  NotReadableError: 'ocupado', 
}

const puedeReintentar = computed(() =>
  ['denegado', 'sin-dispositivos', 'ocupado', 'error'].includes(estado.value),
)


async function pedirMedia() {
  const medios = navigator.mediaDevices
  try {
    return await medios.getUserMedia({ video: true, audio: true })
  } catch (error) {
    if (error.name !== 'NotFoundError') throw error
    try {
      return await medios.getUserMedia({ audio: true })
    } catch {
      // sigue: probamos solo con la cámara
    }
    return await medios.getUserMedia({ video: true })
  }
}

async function iniciar() {
  // getUserMedia solo existe con HTTPS o en localhost
  if (!navigator.mediaDevices?.getUserMedia) {
    estado.value = 'no-soportado'
    emit('denegado', 'no-soportado')
    return
  }

  try {
    const obtenido = await pedirMedia()

    if (!montado) {
      obtenido.getTracks().forEach((pista) => pista.stop())
      return
    }

    stream = obtenido
    tieneVideo.value = obtenido.getVideoTracks().length > 0
    tieneAudio.value = obtenido.getAudioTracks().length > 0
    estado.value = 'activo'
    videoEl.value.srcObject = stream
    emit('listo', stream)
  } catch (error) {
    estado.value = ESTADO_POR_ERROR[error.name] ?? 'error'
    emit('denegado', error.name)
  }
}

function reintentar() {
  estado.value = 'cargando'
  iniciar()
}

function alternarMic() {
  micActivo.value = !micActivo.value
  stream?.getAudioTracks().forEach((pista) => {
    pista.enabled = micActivo.value
  })
}

function alternarCam() {
  camActiva.value = !camActiva.value
  stream?.getVideoTracks().forEach((pista) => {
    pista.enabled = camActiva.value
  })
}

function detener() {
  montado = false
  stream?.getTracks().forEach((pista) => pista.stop())
  stream = null
}

onMounted(iniciar)
onBeforeUnmount(detener)
</script>

<template>
  <div class="previsualizacion">
    <video v-show="estado === 'activo' && tieneVideo" ref="videoEl" autoplay muted playsinline />

    <p v-if="estado === 'cargando'">Pidiendo permiso de cámara y micrófono…</p>

    <p v-else-if="estado === 'denegado'">
      El acceso a la cámara y al micrófono está bloqueado. Puedes permitirlo desde el candado de
      la barra de direcciones y pulsar «Reintentar», o embarcar sin ellos.
    </p>
    <p v-else-if="estado === 'sin-dispositivos'">
      No se ha encontrado ninguna cámara ni micrófono. Puedes embarcar sin ellos.
    </p>
    <p v-else-if="estado === 'ocupado'">
      Otra aplicación está usando la cámara o el micrófono. Ciérrala y pulsa «Reintentar», o
      embarca sin ellos.
    </p>
    <p v-else-if="estado === 'no-soportado'">
      Este navegador no permite usar cámara ni micrófono (hace falta HTTPS o localhost). Puedes
      embarcar sin ellos.
    </p>
    <p v-else-if="estado === 'error'">
      No se ha podido acceder a la cámara ni al micrófono. Puedes embarcar sin ellos.
    </p>

    <template v-else-if="estado === 'activo'">
      <p v-if="!tieneVideo">No se ha encontrado cámara: solo se usará el micrófono.</p>
      <p v-if="!tieneAudio">No se ha encontrado micrófono: solo se usará la cámara.</p>
    </template>

    <button v-if="puedeReintentar" type="button" @click="reintentar">Reintentar</button>

    <div v-if="estado === 'activo'" class="controles">
      <button v-if="tieneAudio" type="button" @click="alternarMic">
        {{ micActivo ? 'Silenciar micro' : 'Activar micro' }}
      </button>
      <button v-if="tieneVideo" type="button" @click="alternarCam">
        {{ camActiva ? 'Apagar cámara' : 'Encender cámara' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.previsualizacion {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

video {
  width: 100%;
  max-width: 320px;
  border-radius: 8px;
  background: #000;
  transform: scaleX(-1);
}

.controles {
  display: flex;
  gap: 0.5rem;
}
</style>