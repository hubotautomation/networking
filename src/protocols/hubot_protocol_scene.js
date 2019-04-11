import HubotProtocol from './hubot_protocol'

export default class HubotSceneProtocol extends HubotProtocol {
    constructor() {
        super()
    }

    activateScene(id) {
        return {
            'type': 'scene',
            'command': 'activate',
            'id': id
        }
    }
}
