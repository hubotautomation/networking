import HubotProtocol from './hubot_protocol'

export default class HubotAmbientProtocol extends HubotProtocol {
    constructor() {
        super()
    }

    static addAmbient(slaves, name) {
        return {
            name: name,
            slaves: slaves
        }
    }
}
