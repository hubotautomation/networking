import HubotProtocol from './hubot_protocol'

export default class HubotIRRFProtocol extends HubotProtocol {
    constructor() {
        super()
    }

    transmit(slaveId, commandId) {
        return {
            'type': 'slave',
            'id': slaveId,
            'command': 'transmit',
            'rfir_command_id': commandId
        }
    }

    recordCommand(slaveId, deviceId) {
        return {
            'type': 'slave',
            'id': slaveId,
            'command': 'record_command',
            'rfir_device_id': deviceId
        }
    }

    keepAliveCommand(slaveId) {
        return {
            'id': slaveId,
            'type': 'keepalive',
            'command': 'wake_up'
        }
    }
}
