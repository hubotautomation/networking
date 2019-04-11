import HubotIRRFProtocol from '../protocols/hubot_protocol_infrared'

export default class HubotIRRFCommand extends HubotIRRFProtocol {
    constructor(slave, id, name) {
        super()

        this.slave = slave
        this.id = id
        this.name = name
        this.socket = slave.socket
    }

    send() {
        let payload = this.transmit(this.slave.id, this.id)

        this.socket.send(payload)
    }
}

