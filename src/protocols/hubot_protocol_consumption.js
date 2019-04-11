import HubotProtocol from './hubot_protocol'

export default class HubotConsumptionProtocol extends HubotProtocol {
    constructor() {
        super()
    }

    consumptionSubscribe(scope, id) {
        return {
            type: 'consumption',
            command: 'subscribe',
            scope: scope || 'all',
            id: id
        }
    }

    consumptionUnsubscribe(scope, id) {
        return {
            type: 'consumption',
            command: 'unsubscribe',
            scope: scope || 'all',
            id: id
        }
    }
}
