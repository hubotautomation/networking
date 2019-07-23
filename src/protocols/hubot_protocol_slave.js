import HubotProtocol from './hubot_protocol'

export default class HubotSlaveProtocol extends HubotProtocol {
    constructor() {
        super()
    }

    static addSlave(factoryAddress) {
        return {
            'type': 'admin',
            'command': 'add_slave',
            'factory_address': factoryAddress
        }
    }

    static buttonlessRegister(type, idl, idh) {
        return {
            'type': 'admin',
            'command': 'buttonless_register',
            'slave_type': type,
            'idl': idl,
            'idh': idh
        }
    }

    static homologSlave(factoryAddress) {
        return {
            'type': 'admin',
            'command': 'homolog_slave',
            'factory_address': factoryAddress
        }
    }

    defaultCheck(slaveId, type) {
        let command = type ? `check_${type}` : 'check'

        return {
            'type': 'slave',
            'command': command,
            'id': slaveId
        }
    }

    calibrationCheck(slaveId) {
        return {
            'type': 'slave',
            'command': 'check_calibration_level',
            'id': slaveId
        }
    }

    calibrateChannel(slaveId, value) {
        return {
            'type': 'slave',
            'value': value,
            'command': 'calibrate_level',
            'id': slaveId
        }
    }

    dimmerRgb(slaveId, r, g, b) {
        return {
            'type': 'slave',
            'rgb': [r, g, b],
            'command': 'rgb_dimmer',
            'id': slaveId
        }
    }

    rgbCommand(slaveId, r, g, b) {
        return {
            'type': 'slave',
            'rgb': [r, g, b],
            'command': 'rgb_control',
            'id': slaveId
        }
    }
}
