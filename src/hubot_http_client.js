import 'isomorphic-fetch'
import moment from 'moment/min/moment.min.js'
import { RequestTimeout, ForbiddenError, CentralNotFoundFailure, NotAuthenticatedFailure } from './errors'
import HubotSlave from './models/hubot_slave'
import HubotAmbient from './models/hubot_ambient'
import HubotScene from './models/hubot_scene'
import HubotRemote from './models/hubot_remote'
import _ from 'lodash'
import Promise from 'bluebird'

const HTTP_TIMEOUT = 10000

export default class HubotHttpClient {
    constructor(options, data) {
        this.authData = options.authData
        this.server = options.server
        this.authServer = options.authServer
        this.local = false

        if (data) {
            this.token = data.token
            this.user = data.user
            this.centrals = data.user.centrals
            this.checkUser(this.token)
        } else {
            this.token = undefined
        }
    }

    /* Authenticates the user on the cloud backend.
     */
    auth() {
        return fetch(`http://${this.authServer}/users/auth`, {
            method: 'POST',
            body: JSON.stringify({
                email: this.authData.email,
                password: this.authData.password
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then((res) => res.json())
        .then((data) => {
            this.token = data.token
            this.user = data.user
            this.centrals = {}

            data.user.centrals.forEach((central) => {
                this.centrals[central['central_id']] = central
            })
            console.log(this.centrals)

            return data
        })
    }

    static createUser(email, password, cpf, name) {
        return fetch('http://cloud.hubot.com.br/users', {
            method: 'POST',
            body: JSON.stringify({
                name,
                email,
                password,
                cpf
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then((res) => res.json())
    }

    changeServer(server) {
        this.server = server
        console.log('CHANGED SERVER TO ', this.server)
    }

    checkUser(user) {
    }

    /* Generic status handler for routes.
     */
    checkStatus(res) {
        if (res.status === 404) {
            console.log('STATUS IS 404')
            throw new CentralNotFoundFailure()
        }

        if (res.status === 401) {
            console.log('STATUS IS 401')
            throw new NotAuthenticatedFailure()
        }

        if (res.status === 403) {
            console.log('STATUS IS 401')
            throw new ForbiddenError()
        }

        return Promise.resolve(res)
    }

    getHeaders(centralId) {
        let central

        if (this.centrals.length) {
            central = _.find(this.centrals, {'central_id': centralId})
        } else {
            central = this.centrals[centralId]
        }

        if (!central) {
            throw new CentralNotFoundFailure()
        }
        return new Headers({
            'x-access-token': central.token,
            'central-id': centralId,
            'Content-Type': 'application/json'
        })
    }

    updateAmbient(wsClient, centralId, id, slaves, name) {
        let headers = this.getHeaders(centralId)
        let payload = HubotAmbient.newAmbient(slaves, name)

        return fetch(`http://${this.server}/ambients/${id}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(payload)
        })
        .then((res) => this.checkStatus(res))
        .then((res) => res.json())
        .then((slave) => {
            return slave
        })
    }

    createAmbient(wsClient, centralId, slaves, name) {
        let payload = HubotAmbient.newAmbient(slaves, name)
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/ambients`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: headers
        })
        .then((res) => res.json())
        .then((data) => {
            return data
        })
    }

    registerCentral(ip) {
        return fetch(`http://${ip}/auth/register`, {
            method: 'GET'
        })
        .then((res) => res.json())
        .then((data) => {
            return data
        })
    }

    cloudRegister(signature, centralId, name) {
        return fetch(`http://${this.authServer}/central/register`, {
            method: 'POST',
            body: JSON.stringify({
                serial: centralId,
                token: signature,
                'central_name': name
            }),
            headers: {
                'Content-Type': 'application/json',
                'x-access-token': this.token
            }
        })
        .then((res) => res.json())
        .then((data) => {
            return data
        })
    }

    getCentrals() {
        return fetch(`http://${this.server}/users/centrals`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-access-token': this.token
            }
        })
        .then((res) => res.json())
        .then((data) => {
            this.centrals = data.centrals
            return data
        })
    }

    // Schedule
    getSchedules(centralId) {
        let headers = this.getHeaders(centralId)

        return new Promise((resolve, reject) => {
            console.log('Fetching...')
            fetch(`http://${this.server}/schedules`, {
                method: 'GET',
                headers: headers,
                timeout: HTTP_TIMEOUT
            })
            .then((res) => this.checkStatus(res))
            .then((res) => res.json())
            .then((data) => resolve(data))
            .catch((err) => reject(err))

            setTimeout(() => {
                reject(new RequestTimeout())
            }, HTTP_TIMEOUT)
        })
    }

    createSchedule(centralId, schedule) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/schedules`, {
            method: 'POST',
            body: JSON.stringify({
                action: schedule.action,
                name: schedule.name,
                cron: schedule.cron,
                active: true
            }),
            headers: headers
        })
        .then((res) => res.json())
        .then((data) => {
            return data
        })
    }

    createUseHoursAlert(centralId, slaveId, alerts) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/alerts/use_hours/${slaveId}`, {
            method: 'POST',
            body: JSON.stringify(alerts),
            headers: headers
        })
        .then((res) => res.json())
    }

    getAlertsBySlaveId(centralId, type, slaveId) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/alerts/${type}/${slaveId}`, {
            method: 'GET',
            headers: headers
        })
        .then((res) => res.json())
    }

    updateSchedule(centralId, schedule) {
        let headers = this.getHeaders(centralId)

        let data = {
            action: schedule.action,
            name: schedule.name,
            cron: schedule.cron,
            active: schedule.active
        }

        return fetch(`http://${this.server}/schedules/${schedule.id}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data)
        })
        .then((res) => this.checkStatus(res))
        .then((res) => res.json())
    }

    deleteSchedule(centralId, id) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/schedules/${id}`, {
            method: 'DELETE',
            headers: headers
        })
        .then((res) => this.checkStatus(res))
        .then((res) => res.json())
    }

    createSlave(wsClient, centralId, slave) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/slaves`, {
            method: 'POST',
            body: JSON.stringify({
                slave: {
                    type: slave.type,
                    'addr_low': slave.addrLow,
                    'addr_high': slave.addrHigh,
                    channels: slave.channels,
                    name: slave.name,
                    color: slave.color,
                    code: slave.code,
                    'operation_mode': slave.operationMode,
                    'is_triphase': slave['is_triphase']
                },
                ambients: slave.ambients
            }),
            headers: headers
        })
        .then((res) => res.json())
        .then((data) => {
            return data
        })
    }

    createScene(wsClient, centralId, scene) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/scenes`, {
            method: 'POST',
            body: JSON.stringify({
                name: scene.name,
                color: scene.color,
                json: scene.json
            }),
            headers: headers
        })
        .then((res) => res.json())
        .then((data) => {
            return data
        })
    }

    deleteScene(wsClient, centralId, id) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/scenes/${id}`, {
            method: 'DELETE',
            headers: headers
        })
        .then((res) => this.checkStatus(res))
        .then((res) => res.json())
        .then((status) => {
            return status
        })
    }

    deleteAmbient(wsClient, centralId, id) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/ambients/${id}`, {
            method: 'DELETE',
            headers: headers
        })
        .then((res) => this.checkStatus(res))
        .then((res) => res.json())
        .then((status) => {
            return status
        })
    }

    updateScene(wsClient, centralId, scene) {
        let headers = this.getHeaders(centralId)

        let data = {
            name: scene.name,
            description: scene.description,
            color: scene.color,
            json: scene.json
        }

        return fetch(`http://${this.server}/scenes/${scene.id}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data)
        })
        .then((res) => this.checkStatus(res))
        .then((res) => res.json())
    }

    createDevice(wsClient, centralId, device) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/devices`, {
            method: 'POST',
            body: JSON.stringify({
                'type': device.type,
                'category': device.category,
                'name': device.name,
                'description': device.description,
                'slave_id': device.slave_id,
                'output': device.output
            }),
            headers: headers
        })
        .then((res) => res.json())
        .then((data) => {
            return data
        })
    }

    updateDevice(wsClient, centralId, device) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/devices/${device.id}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({
                type: device.type,
                name: device.name,
                category: device.category,
                description: device.description,
                output: device.output
            })
        })
        .then((res) => this.checkStatus(res))
        .then((res) => res.json())
        .then((device) => {
            return device
        })
    }

    deleteDevice(wsClient, centralId, id) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/devices/${id}`, {
            method: 'DELETE',
            headers: headers
        })
        .then((res) => this.checkStatus(res))
        .then((res) => res.json())
        .then((status) => {
            return status
        })
    }

    createChannel(wsClient, centralId, channel) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/channels`, {
            method: 'POST',
            body: JSON.stringify({
                'type': channel.type,
                'channel': channel.channel,
                'name': channel.name,
                'description': channel.description,
                'slave_id': channel.slave_id,
                'scene_id': channel.scene_id
            }),
            headers: headers
        })
        .then((res) => res.json())
        .then((data) => {
            return data
        })
    }

    getAmbients(wsClient, centralId) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/ambients`, {
            method: 'GET',
            headers: headers
        })
        .then((res) => res.json())
        .then((data) => {
            return data.map((ambient) => {
                return new HubotAmbient(
                    wsClient,
                    ambient.id,
                    ambient.name,
                    ambient.image,
                    ambient.slaves
                )
            })
        })
    }

    getScenes(wsClient, centralId) {
        let headers = this.getHeaders(centralId)

        return new Promise((resolve, reject) => {
            fetch(`http://${this.server}/scenes`, {
                method: 'GET',
                headers: headers,
                timeout: HTTP_TIMEOUT
            })
            .then((res) => this.checkStatus(res))
            .then((res) => res.json())
            .then((scenes) => {
                resolve(scenes.map((scene) => {
                    return new HubotScene(
                       wsClient,
                       scene.id,
                       scene.json,
                       scene.description,
                       scene.name,
                       scene.color
                    )
                }))
            }).catch((err) => reject(err))

            setTimeout(() => {
                reject(new RequestTimeout())
            }, HTTP_TIMEOUT)
        })
    }

    getSlaves(wsClient, centralId) {
        let headers = this.getHeaders(centralId)

        return new Promise((resolve, reject) => {
            fetch(`http://${this.server}/slaves`, {
                method: 'GET',
                headers: headers,
                timeout: HTTP_TIMEOUT
            })
            .then((res) => this.checkStatus(res))
            .then((res) => res.json())
            .then((data) => {
                resolve(data.map((slave) => {
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
                }))
            }).catch((err) => resolve(err))

            setTimeout(() => {
                reject(new RequestTimeout())
            }, HTTP_TIMEOUT)
        })
    }

    getDeviceRemotes(wsClient, centralId, deviceId) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/devices/${deviceId}/remotes`, {
            method: 'GET',
            headers: headers
        })
        .then((res) => this.checkStatus(res))
        .then((res) => res.json())
        .then((data) => {
            let remote = _.first(data)

            return new HubotRemote(
                remote.id,
                remote.name,
                remote.rfir_buttons
            )
        })
    }

    updateSlave(wsClient, centralId, slave) {
        let headers = this.getHeaders(centralId)

        let data = {
            'slave': {
                'type': slave.type,
                'name': slave.name,
                'color': slave.color,
                'operation_mode': slave.operationMode,
                'is_triphase': slave['is_triphase']
            },
            'ambients': slave.ambients
        }

        console.log(data)
        console.log(JSON.stringify(data))

        return fetch(`http://${this.server}/slaves/${slave.id}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data)
        })
        .then((res) => this.checkStatus(res))
        .then((res) => res.json())
        .then((slave) => {
            return slave
        })
    }

    updateChannel(wsClient, centralId, channel) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/channels/${channel.id}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({
                id: channel.id,
                name: channel.name,
                type: channel.type,
                channel: channel.channel
            })
        })
        .then((res) => this.checkStatus(res))
        .then((res) => res.json())
        .then((channel) => {
            return channel
        })
    }

    deleteChannel(wsClient, centralId, id) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/channels/${id}`, {
            method: 'DELETE',
            headers: headers
        })
        .then((res) => this.checkStatus(res))
        .then((res) => res.json())
        .then((status) => {
            return status
        })
    }

    deleteSlave(wsClient, centralId, id) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/slaves/${id}`, {
            method: 'DELETE',
            headers: headers
        })
        .then((res) => this.checkStatus(res))
        .then((res) => res.json())
        .then((status) => {
            return status
        })
    }

    deleteButton(centralId, button) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/rfir_buttons/${button.id}`, {
            method: 'DELETE',
            headers: headers
        })
        .then((res) => res.json())
        .then((data) => {
            return data
        })
    }

    createButton(centralId, button) {
        let headers = this.getHeaders(centralId)

        return fetch(`http://${this.server}/rfir_buttons`, {
            method: 'POST',
            body: JSON.stringify({
                name: button.name,
                indexes: button.indexes,
                color: button.color,
                type: button.type,
                'rfir_command_id': button.rfir_command_id,
                'rfir_remote_id': button.rfir_remote_id
            }),
            headers: headers
        })
        .then((res) => res.json())
        .then((data) => {
            return data
        })
    }

    // Energy
    getEnergyData(centralId, period, api, reference, scope, id) {
        let headers = this.getHeaders(centralId)

        let from = reference.startOf(period).toJSON()
        let to = reference.endOf(period).toJSON()
        let url

        if (scope === 'all') {
            url = `http://${this.server}/consumption/${scope}/${api}/${from}/${to}`
        } else {
            url = `http://${this.server}/consumption/${scope}/${id}/${api}/${from}/${to}`
        }

        return fetch(url, {
            method: 'GET',
            headers: headers
        })
        .then((res) => this.checkStatus(res))
        .then((res) => res.json())
    }

    getDayEnergy(centralId, day, scope, id) {
        if (!day) {
            day = moment()
        } else {
            day = moment(day)
        }

        return this.getEnergyData(centralId, 'day', 'hour', day, scope, id)
    }

    getMonthEnergy(centralId, month, scope, id) {
        if (!month) {
            month = moment()
        } else {
            month = moment(month)
        }

        return this.getEnergyData(centralId, 'month', 'day', month, scope, id)
    }

    getYearEnergy(centralId, year, scope, id) {
        if (!year) {
            year = moment()
        } else {
            year = moment(year)
        }

        return this.getEnergyData(centralId, 'year', 'month', year, scope, id)
    }
}
