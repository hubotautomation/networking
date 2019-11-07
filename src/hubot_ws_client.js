import Promise from 'bluebird'
import MessageObserver from './utils/message_observer'
import {
    ConnectionFailure,
    AuthenticationFailure,
    MaxRetriesFailure,
    NotAuthenticatedFailure
} from './errors'

let MAX_RETRIES = 10

export default class HubotWsClient {
    constructor(WebSocket, options) {
        this.Ws = WebSocket
        this.server = options.server
        this.protocol = options.protocol || 'ws'
        this.port = options.port || 80
        this.path = options.path || ''
        this.authenticated = false
        this.authData = options.authData
        this.retries = 0
        this.dead = false
        this.listeners = {}
        this.subscribe('auth_req', () => this.auth())
    }

    heartbeat() {
        // console.log('heartbeat!', this.pingTimeout)
        /* clearTimeout(this.pingTimeout)

        this.pingTimeout = setTimeout(() => {
            console.log('Did not receive any messages in the last 10 seconds, will terminate.')
            this.onClose()
        }, 5 * 1000) */
    }

    changeServer(server) {
        this.server = server
        this.reconnect()
    }

    onMessage(data) {
        let message = JSON.parse(data)

        if (message.message_type === 'pong') {
            this.lastPing = new Date().getTime()
        }

        if (message.message_type && this.listeners[message.message_type]) {
            let observer = this.listeners[message.message_type]

            observer.fire(message)
        }

        this.heartbeat()
    }

    subscribe(messageType, fn) {
        let listener = this.listeners[messageType]

        if (listener) {
            listener.subscribe(fn)
        } else {
            let observer = new MessageObserver()

            observer.subscribe(fn)
            this.listeners[messageType] = observer
        }
    }

    onClose() {
        if (this.dead) return
        clearInterval(this.pingInterval)

        console.log('Connection closed.')

        if (this.listeners['connection_closed']) {
            let observer = this.listeners['connection_closed']

            observer.fire()
        }

        if (this.retries <= MAX_RETRIES) {
            console.log('Retries => ', this.retries)
            setTimeout(async () => {
                try {
                    await this.connect()
                    this.retries = 0
                } catch(e) {
                    console.log('Connection failed.')
                }
            }, 1000)
        } else {
            console.log('Timeout, throwing.')
            if (this.listeners['connection_timeout']) {
                let observer = this.listeners['connection_timeout']

                observer.fire()
            }
            throw new MaxRetriesFailure()
        }
    }

    onError(err) {
        console.log('error, do nothing', err)
    }

    onConnection() {
        clearTimeout(this.connTimeout)
        clearInterval(this.pingInterval)

        this.pingInterval = setInterval(() => this._ping(), 2500)
        this.lastPing = new Date().getTime()

        if (this.listeners['connection_success']) {
            let observer = this.listeners['connection_success']

            observer.fire()
        }
    }

    _ping() {
        if (this.dead) return
        if ((new Date().getTime() - this.lastPing) > (5 * 1000)) {
            this.reconnect()
            return
        }

        this.send({
            'type': 'ping',
            'command': ''
        })
    }

    send(data) {
        let message = JSON.stringify(data)

        if (this.socket.readyState !== 1) return

        if (this.authenticated) {
            this.socket.send(message)
        } else {
            throw new NotAuthenticatedFailure()
        }
    }

    auth() {
        return new Promise((resolve, reject) => {

            this.subscribe('auth_success', (message) => {
                this.authenticated = true

                if (this.success) {
                    this.success(this)
                }

                return resolve(this)
            })

            this.subscribe('auth_error', (message) => {
                if (this.fail) {
                    this.fail(this)
                }

                return reject(new AuthenticationFailure())
            })

            let payload = JSON.stringify({
                'message_type': 'auth',
                'token': this.authData.token,
                'central_id': this.authData.central_id
            })

            this.socket.send(payload)
        })
    }

    reconnect() {
        clearInterval(this.pingInterval)
        console.log('Reconnecting.')
        this.retries = 0
        if (this.socket) {
            this.socket.close()
        }
    }

    connect() {
        console.log('Connecting.')

        if (this.listeners['connection_connecting']) {
            let observer = this.listeners['connection_connecting']

            observer.fire()
        }

        this.retries = this.retries + 1

        if (this.connTimeout) clearTimeout(this.connTimeout)

        this.connTimeout = setTimeout(() => {
            console.log('Conn timeout.')
            this.socket.close()
        }, 5000)

        return new Promise((resolve, reject) => {
            try {
                console.log(`Connecting to ${this.protocol}://${this.server}:${this.port}${this.path}`)
                this.socket = new this.Ws(`${this.protocol}://${this.server}:${this.port}${this.path}`)

                this.success = resolve
                this.fail = reject

                if (this.socket.on) {
                    // Node WS Client
                    this.socket.on('connection', this.onConnection.bind(this))
                    this.socket.on('message', this.onMessage.bind(this))
                    this.socket.on('close', this.onClose.bind(this))
                    this.socket.on('error', this.onError.bind(this))
                } else {
                    // HTML5
                    this.socket.onopen = (message) => this.onConnection(message.data)
                    this.socket.onmessage = (message) => this.onMessage(message.data)
                    this.socket.onclose = (message) => this.onClose(message.data)
                    this.socket.onerror = (message) => this.onError(message.data)
                }

            } catch(e) {
                console.log('Error => ', e)
                reject(new ConnectionFailure())
            }
        })
    }

    close() {
        this.dead = true
        if (this.socket) {
            this.socket.close()
        }
    }
}
