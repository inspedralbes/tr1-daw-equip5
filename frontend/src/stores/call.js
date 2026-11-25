import { defineStore } from 'pinia'
import { markRaw } from 'vue'


export const useCallStore = defineStore('call', {
    state: () => ({
        // Entry screen: the user may enter even without camera/mic
        permission: 'unknown',  // 'unknown' | 'granted' | 'denied' | 'unavailable'
        localStream: null,      // MediaStream (preview + calls)

        groupId: null,          // zoneId of the call group (or null)
        peers: {},              // { [playerId]: { stream, connectionState } }

        // From the room:join ack
        iceServers: [],
        maxCallSize: 6
    }),

    getters: {
        peerList: (state) =>
            Object.entries(state.peers).map(([id, p]) => ({ id, ...p })),
        peerCount: (state) => Object.keys(state.peers).length,
        // The video panel is shown only while there is someone in the call
        isInCall() {
            return this.peerCount > 0
        },
        canSendMedia: (state) => state.permission === 'granted' && !!state.localStream,
        isFull() {
            return this.peerCount + 1 >= this.maxCallSize
        }
    },

    actions: {
        // --- permission / local stream (entry screen) ---
        setPermission(permission) {
            this.permission = permission
        },
        setLocalStream(stream) {
            this.stopLocalStream()
            this.localStream = stream ? markRaw(stream) : null
        },
        stopLocalStream() {
            this.localStream?.getTracks().forEach((t) => t.stop())
            this.localStream = null
        },

        // room:join ack
        setConfig({ iceServers, limits }) {
            this.iceServers = iceServers ?? []
            if (limits?.maxCallSize) this.maxCallSize = limits.maxCallSize
        },

        // --- call lifecycle (zone:* and rtc:*) ---
        setGroup(zoneId) {
            this.groupId = zoneId
        },
        addPeer(id) {
            if (!this.peers[id]) this.peers[id] = { stream: null, connectionState: 'connecting' }
        },
        setPeerStream(id, stream) {
            if (this.peers[id]) this.peers[id].stream = stream ? markRaw(stream) : null
        },
        setPeerState(id, connectionState) {
            if (this.peers[id]) this.peers[id].connectionState = connectionState
        },
        removePeer(id) {
            delete this.peers[id]
        },
        // zone:left or leaving the room
        leaveCall() {
            this.peers = {}
            this.groupId = null
        }
    }
})