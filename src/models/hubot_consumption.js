import MessageObserver from '../utils/message_observer'
import HubotConsumptionProtocol from '../protocols/hubot_protocol_consumption'

export default class HubotConsumption extends HubotConsumptionProtocol {
    constructor(socket) {
        super()

        this.socket = socket
        this.observer = new MessageObserver()
        this.setupListeners()
    }

    setupListeners() {
        this.socket.subscribe('consumption', (message) => this.observer.fire(message))
    }

    subscribe(fn) {
        this.observer.subscribe(fn)
    }

    subscribeConsumption(scope, id) {
        let payload = this.consumptionSubscribe(scope, id)

        this.socket.send(payload)
    }

    unsubscribeConsumption(scope, id) {
        let payload = this.consumptionUnsubscribe(scope, id)

        this.observer.clear()
        this.socket.send(payload)
    }
}
