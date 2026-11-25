import { defineStore } from 'pinia'

export const usePresenceStore = defineStore('presence', {
    state: () => ({
        users: []
    })
})