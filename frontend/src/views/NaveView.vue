<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { iniciarMovimiento, detenerMovimiento } from '@/services/movimiento'

onMounted(iniciarMovimiento)
onBeforeUnmount(detenerMovimiento)
</script>

<template>
  <h1>Nave</h1>
</template>