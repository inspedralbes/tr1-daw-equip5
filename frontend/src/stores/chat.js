import { defineStore } from 'pinia'

const MAX_MESSAGES = 200

export const useChatStore = defineStore('chat', {
    state: () => ({
        messages: [],
        scope: 'room',   // active tab: 'room' | 'zone' | 'proximity'
        isOpen: false,
        unread: 0
    }),

    getters: {
        // Messages of the active tab
        visibleMessages: (state) => state.messages.filter((m) => m.scope === state.scope)
    },

    actions: {
        addMessage(msg) {
            if (this.messages.some((m) => m.id === msg.id)) return
            this.messages.push(msg)
            if (this.messages.length > MAX_MESSAGES) this.messages.shift()
            if (!this.isOpen) this.unread++
        },

        setScope(scope) {
            this.scope = scope
        },

        open() {
            this.isOpen = true
            this.unread = 0
        },
        close() {
            this.isOpen = false
        },
        toggle() {
            this.isOpen ? this.close() : this.open()
        },

        clear() {
            this.messages = []
            this.unread = 0
        }
    }
})