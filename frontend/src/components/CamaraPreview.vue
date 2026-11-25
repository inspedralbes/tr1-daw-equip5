<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits(['listo', 'denegado'])

const videoEl = ref(null)
const estado = ref('cargando')
const micActivo = ref(true)
const camActiva = ref(true)

let stream = null
let montado = true

async function iniciar() {
  if (!navigator.mediaDevices?.getUserMedia) {
    estado.value = 'no-soportado'
    emit('denegado', 'no-soportado')
    return
  }

  try {
    const obtenido = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    })

    if (!montado) {
      obtenido.getTracks().forEach((pista) => pista.stop())
      return
    }

    stream = obtenido
    estado.value = 'activo'
    videoEl.value.srcObject = stream
    emit('listo', stream)
  } catch (error) {
    estado.value = 'denegado'
    emit('denegado', error.name)
  }
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
    <video v-show="estado === 'activo'" ref="videoEl" autoplay muted playsinline />

    <p v-if="estado === 'cargando'">Pidiendo permiso de cámara y micrófono…</p>
    <p v-else-if="estado === 'denegado'">
      No hay permiso para la cámara o el micrófono. Puedes embarcar sin ellos.
    </p>
    <p v-else-if="estado === 'no-soportado'">
      Este navegador no permite usar cámara ni micrófono (hace falta HTTPS o localhost).
      Puedes embarcar sin ellos.
    </p>

    <div v-if="estado === 'activo'" class="controles">
      <button type="button" @click="alternarMic">
        {{ micActivo ? 'Silenciar micro' : 'Activar micro' }}
      </button>
      <button type="button" @click="alternarCam">
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