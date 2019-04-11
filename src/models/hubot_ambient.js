import HubotAmbientProtocol from '../protocols/hubot_protocol_ambient'
import HubotSlave from './hubot_slave'
import _ from 'lodash'

/* Types can be:
 * - light_switch
 * - outlet
 */
export default class HubotAmbient extends HubotAmbientProtocol {
    constructor(wsClient, id, name, image, slaves) {
        super()

        this.id = id
        this.name = name
        this.image = image
        this.slaves = slaves.map((slave) => {
            return new HubotSlave(
                wsClient,
                slave.id,
                slave.type,
                slave.name,
                slave.color,
                slave.code,
                slave.channels_list,
                slave.devices,
                slave.temperature,
                slave.battery,
                slave['is_triphase'],
                slave.status
            )
        })
    }

    static newAmbient(slaves, name) {
        return HubotAmbientProtocol.addAmbient(slaves, name)
    }

    relateSlaves(slaves) {
        this.slaves = this.slaves.map((slave) => {
            let relSlave = _.find(slaves, {'id': slave.id})

            if (relSlave) {
                slave.channels = relSlave.channels
                slave.status = relSlave.status
            }

            return slave
        })

        return this
    }
}
