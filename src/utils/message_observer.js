export default class MessageObserver {
    constructor(fn) {
        this.handlers = []

        if (fn) {
            this.subscribe(fn)
        }
    }

    subscribe(fn) {
        if (this.handlers.find(f => f === fn)) return

        this.handlers.push(fn)
    }

    unsubscribe(fn) {
        this.handlers = this.handlers.filter((item) => {
            return item !== fn
        })
    }

    clear() {
        this.handlers = []
    }

    fire(o) {
        this.handlers.forEach((handler) => handler(o))
    }
}
