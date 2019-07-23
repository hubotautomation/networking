import HubotSlaveProtocol from '../protocols/hubot_protocol_slave'
import HubotChannelProtocol from '../protocols/hubot_protocol_channel'
import HubotChannel from './hubot_channel'
import HubotIRRFDevice from './hubot_irrf'
import _ from 'lodash'

export default class HubotSlave extends HubotSlaveProtocol {
    constructor(socket, id, type, name, color, code, channels,
                devices, temperature, battery, isTriphase, status, averageRetries) {
        super()

        this.id = id
        this.type = type
        this.name = name
        this.color = color
        this.code = code
        this.socket = socket
        this.status = status
        this.temperature = temperature
        this.battery = battery
        this['is_triphase'] = isTriphase
        this.lastConsumption = undefined
        this.averageRetries = 0

        if (!channels) {
            this.channels = []
        } else {
            this.channels = _.map(channels, (channel) => {
                return new HubotChannel(
                    this,
                    channel.id,
                    channel.name,
                    channel.channel,
                    channel.value,
                    channel.type,
                    channel.scene_id
                )
            })
        }

        if (!devices) {
            this.devices = []
        } else {
            this.devices = _.map(devices, (device) => {
                return new HubotIRRFDevice(
                  this,
                  device.id,
                  device.type,
                  device.category,
                  device.name,
                  device.command_on_id,
                  device.command_off_id,
                  device.rfir_commands,
                  device.output
                )
            })
        }

        this.setupListeners()
    }

    setupListeners() {
        this.socket.subscribe('status_update', (message) => {
            if (message.id === this.id) {
                this.status = message.status
                this.averageRetries = message['average_retries'] || this.averageRetries
            }
        })
    }

    setLastConsumption(value) {
        this.lastConsumption = value
    }

    testChannel(channel, value) {
        let payload = HubotChannelProtocol.lightControl(this.id, channel, value)

        this.socket.send(payload)
    }

    calibrate(value) {
        let payload = this.calibrateChannel(this.id, value)

        this.socket.send(payload)
    }

    checkCalibration() {
        let payload = this.calibrationCheck(this.id)

        this.socket.send(payload)
    }

    check(type) {
        let payload = this.defaultCheck(this.id, type)

        this.socket.send(payload)
    }

    rgbDimmer(r, g, b) {
        let payload = this.dimmerRgb(this.id, r, g, b)

        this.socket.send(payload)
    }

    rgb(r, g, b) {
        let payload = this.rgbCommand(this.id, r, g, b)

        this.socket.send(payload)
    }

    static registerNewSlave(code) {
        let payload = HubotSlaveProtocol.addSlave(code)

        this.socket.send(payload)
    }

    static homologSlave(socket, factoryAddress) {
        let payload = HubotSlaveProtocol.homologSlave(factoryAddress)

        socket.send(payload)
    }

    static buttonlessRegister(socket, type, idl, idh) {
        let payload = HubotSlaveProtocol.buttonlessRegister(type, idl, idh)

        socket.send(payload)
    }
}
