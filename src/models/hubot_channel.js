import HubotChannelProtocol from '../protocols/hubot_protocol_channel'
import MessageObserver from '../utils/message_observer'

/* Types can be:
 * - light_switch
 * - outlet
 */
export default class HubotChannel {
    constructor(slave, id, name, channel, value, type, sceneId) {

        this.slave = slave
        this.id = id
        this.channel = channel
        this.value = value || 0
        this.type = type
        this.name = name
        this.sceneId = sceneId

        // Get socket from slave
        this.socket = this.slave.socket
        this.observer = new MessageObserver()
        this.setupListeners()
    }

    subscribe(fn) {
        this.observer.subscribe(fn)
    }

    unsubscribe(fn) {
        this.observer.unsubscribe(fn)
    }

    setupListeners() {
        this.socket.subscribe('channel_update', (message) => {
            if (this.slave.id === message.id) {
                let channel = message.channels.find((channel) => {
                    return channel.id === this.channel
                })

                if (channel) {
                    this.value = channel.value
                }

                this.observer.fire()
            }
        })

        this.socket.subscribe('timeout', (message) => {
            if (this.slave.id === message.id) {
                // this.value = this.lastState
                this.observer.fire()
            }
        })
    }

    lightSwitch(value) {
        // this.lastState = this.value
        let payload = HubotChannelProtocol.lightControl(this.slave.id, this.channel, value)

        // this.value = value
        this.socket.send(payload)
    }

    dimmer(value) {
        let payload = HubotChannelProtocol.lightDimmer(this.slave.id, this.channel, value)

        // this.value = value
        this.socket.send(payload)
    }
}
