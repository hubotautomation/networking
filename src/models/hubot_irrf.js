import HubotIRRFProtocol from '../protocols/hubot_protocol_infrared'
import MessageObserver from '../utils/message_observer'
import HubotIRRFCommand from './hubot_irrf_command'
import moment from 'moment/min/moment.min.js'

const KEEPALIVE_TIMER = 5000

export default class HubotIRRFDevice extends HubotIRRFProtocol {
    constructor(slave, id, type, category, name, commandOnId, commandOffId, rfirCommands, output) {
        super()

        this.lastPing = undefined
        this.slave = slave
        this.id = id
        this.type = type
        this.category = category
        this.output = output
        this.name = name
        this.commandOnId = commandOnId
        this.commandOffId = commandOffId
        this.rfirCommands = rfirCommands.map((command) => {
            return new HubotIRRFCommand(
                this.slave,
                command.id,
                command.name
            )
        })

        // Get socket from slave
        this.socket = this.slave.socket
        this.shouldKeepAlive = false
        this.keepAliveTimer = undefined
        this.observer = new MessageObserver()
        this.setupListeners()
    }

    static transmitTest(socket, slaveId, commandId) {
        let payload = {
            'type': 'slave',
            'id': slaveId,
            'command': 'transmit',
            'rfir_command_id': commandId
        }

        socket.send(payload)
    }

    setLastPing(time) {
        this.lastPing = time
    }

    isAwake() {
        return this.lastPing && this.lastPing.diff(moment(), 'seconds') > (-15)
    }

    newButton() {
        let payload = this.recordCommand(this.slave.id, this.id)

        console.log(payload)
        this.socket.send(payload)
    }

    keepAlive() {
        console.log('Setting up Keep Alive')
        let payload = this.keepAliveCommand(this.slave.id)

        this.shouldKeepAlive = true
        this.stopKeepAlive()
        this.socket.send(payload)

        this.keepAliveTimer = setInterval(() => {
            console.log('KEEPING ALIVE')
            this.socket.send(payload)
        }, KEEPALIVE_TIMER)
    }

    stopKeepAlive() {
        if (this.keepAliveTimer) {
            clearInterval(this.keepAliveTimer)
        }
    }

    subscribe(fn) {
        this.observer.subscribe(fn)
    }

    unsubscribe(fn) {
        this.observer.unsubscribe(fn)
    }

    setupListeners() {
        this.socket.subscribe('action_reply', (message) => {
            this.lastPing = moment()
            this.observer.fire(message)
        })

        this.socket.subscribe('transmit_success', (message) => {
            if (message.id === this.slave.id) {
                this.lastPing = moment()
                this.observer.fire(message)
            }
        })

        this.socket.subscribe('timeout', (message) => {
            if (message.id === this.slave.id) {
                this.observer.fire(message)
            }
        })
    }
}
