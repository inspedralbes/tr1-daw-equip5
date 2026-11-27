import mitt from 'mitt'

// Bus único de la aplicación: Vue y Phaser se pasan mensajes por aquí.
// Phaser no conoce el socket ni Pinia, solo este bus.
// Lista de mensajes: doc/arquitectura/bus-vue-phaser.md
export const bus = mitt()