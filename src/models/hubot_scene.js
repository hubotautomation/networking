import HubotSceneProtocol from '../protocols/hubot_protocol_scene'
import MessageObserver from '../utils/message_observer'

export default class HubotScene extends HubotSceneProtocol {
    constructor(socket, id, json, description, name, color, ambientId) {
        super()

        this.id = id
        this.json = json
        this.description = description
        this.ambientId = ambientId
        this.name = name
        this.color = color
        this.colorRgb = this.convertColor(color)
        this.socket = socket
        this.setupListeners()
        this.status = 'idle'
        this.observer = new MessageObserver()
    }

    setupListeners() {
        this.socket.subscribe('scene_status', (message) => {
            if (message.status === 'finished') {
                this.status = 'idle'
            }

            this.observer.fire(message)
        })
    }

    subscribe(fn) {
        this.observer.subscribe(fn)
    }

    activate() {
        let payload = this.activateScene(this.id)

        this.socket.send(payload)
        this.status = 'busy'
    }

    convertColor(color) {
        let values = color.split(',')

        return values.map((value) => {
            return Math.ceil(value * 255)
        })
    }
}
