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
        this.protocol = options.protocol || 'http'
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

    static createUser(options, email, password, cpf, name) {
        return fetch(`${options.protocol}://${options.authServer}/users`, {
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

    static getLocalCentralData() {
        if (!window) throw new Error('No window is defined, this method is only to be called from the browser')
        return fetch(`http://${window.location.hostname}:8080/acl/local_token`, {
            method: 'GET',
            timeout: 1000
        })
        .then((res) => res.json())
    }

    /* Authenticates the user on the cloud backend.
    */
    auth() {
        return fetch(`${this.protocol}://${this.authServer}/users/auth`, {
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

    updateAmbient(wsClient, centralId, id, slaves, name) {
        let headers = this.getHeaders(centralId)
        let payload = HubotAmbient.newAmbient(slaves, name)

        return fetch(`${this.protocol}://${this.server}/ambients/${id}`, {
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

        return fetch(`${this.protocol}://${this.server}/ambients`, {
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
        return fetch(`${this.protocol}://${this.authServer}/central/register`, {
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

    getCentralUsers(centralId) {
        let headers = this.getAuthHeaders()

        return fetch(`${this.protocol}://${this.authServer}/central/${centralId}/users`, {
            method: 'GET',
            headers: headers,
            timeout: HTTP_TIMEOUT
        })
            .then((res) => this.checkStatus(res))
            .then((res) => res.json())
            .then((data) => {
                return data
            })
    }

    getUserPermissions(centralId, userId) {
        let headers = this.getHeaders(centralId)

        return new Promise((resolve, reject) => {
            fetch(`${this.protocol}://${this.server}/ambient_permissions/user/${userId}`, {
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

    createAmbientPermission(centralId, expires, user, ambients) {
        let headers = this.getHeaders(centralId)

        return fetch(`${this.protocol}://${this.server}/ambient_permissions`, {
            method: 'POST',
            body: JSON.stringify({
                ambients,
                expires,
                userId: user
            }),
            headers: headers
        })
            .then((res) => res.json())
            .then((data) => {
                return data
            })
    }

    changePassword(oldPassword, password) {
        let headers = this.getAuthHeaders()

        return fetch(`${this.protocol}://${this.server}/users/change_password`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                oldPassword,
                password
            })
        }).then((res) => res.json())
    }

    getCentrals() {
        let headers = this.getAuthHeaders()

        return fetch(`${this.protocol}://${this.server}/users/centrals`, {
            method: 'GET',
            headers: headers
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
            fetch(`${this.protocol}://${this.server}/schedules`, {
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

    getMetadata(centralId, action, page) {
        let headers = this.getHeaders(centralId)

        return new Promise((resolve, reject) => {
            fetch(`${this.protocol}://${this.server}/metadata/${action}/${page}`, {
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

        return fetch(`${this.protocol}://${this.server}/schedules`, {
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

    createDefaultConsumptionAlert(centralId, slaveId, extra) {
        let headers = this.getHeaders(centralId)

        return fetch(`${this.protocol}://${this.server}/alerts/default_consumption/${slaveId}`, {
            method: 'POST',
            body: JSON.stringify(extra),
            headers: headers
        })
            .then((res) => res.json())
    }

    createUseHoursAlert(centralId, slaveId, alerts) {
        let headers = this.getHeaders(centralId)

        return fetch(`${this.protocol}://${this.server}/alerts/use_hours/${slaveId}`, {
            method: 'POST',
            body: JSON.stringify(alerts),
            headers: headers
        })
            .then((res) => res.json())
    }

    getAlertsBySlaveId(centralId, type, slaveId) {
        let headers = this.getHeaders(centralId)

        return fetch(`${this.protocol}://${this.server}/alerts/${type}/${slaveId}`, {
            method: 'GET',
            headers: headers
        })
            .then((res) => res.json())
    }

    deleteAlert(centralId, id) {
        let headers = this.getHeaders(centralId)

        return fetch(`${this.protocol}://${this.server}/alerts/${id}`, {
            method: 'DELETE',
            headers: headers
        })
            .then((res) => this.checkStatus(res))
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

        return fetch(`${this.protocol}://${this.server}/schedules/${schedule.id}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data)
        })
            .then((res) => this.checkStatus(res))
            .then((res) => res.json())
    }

    deleteSchedule(centralId, id) {
        let headers = this.getHeaders(centralId)

        return fetch(`${this.protocol}://${this.server}/schedules/${id}`, {
            method: 'DELETE',
            headers: headers
        })
            .then((res) => this.checkStatus(res))
            .then((res) => res.json())
    }

    createSlave(wsClient, centralId, slave) {
        let headers = this.getHeaders(centralId)

        return fetch(`${this.protocol}://${this.server}/slaves`, {
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
                    aggregate: slave.aggregate,
                    version: '4.0.0',
                    'clamp_type': slave['clamp_type']
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

        return fetch(`${this.protocol}://${this.server}/scenes`, {
            method: 'POST',
            body: JSON.stringify({
                name: scene.name,
                color: scene.color,
                json: scene.json,
                ambientId: scene.ambientId
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

        return fetch(`${this.protocol}://${this.server}/scenes/${id}`, {
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

        return fetch(`${this.protocol}://${this.server}/ambients/${id}`, {
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
            json: scene.json,
            ambientId: scene.ambientId
        }

        return fetch(`${this.protocol}://${this.server}/scenes/${scene.id}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data)
        })
            .then((res) => this.checkStatus(res))
            .then((res) => res.json())
    }

    createDevice(wsClient, centralId, device) {
        let headers = this.getHeaders(centralId)

        return fetch(`${this.protocol}://${this.server}/devices`, {
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

        return fetch(`${this.protocol}://${this.server}/devices/${device.id}`, {
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

        return fetch(`${this.protocol}://${this.server}/devices/${id}`, {
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

        return fetch(`${this.protocol}://${this.server}/channels`, {
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

        return fetch(`${this.protocol}://${this.server}/ambients`, {
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
            fetch(`${this.protocol}://${this.server}/scenes`, {
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
                            scene.color,
                            scene.ambientId
                        )
                    }))
                }).catch((err) => reject(err))

            setTimeout(() => {
                reject(new RequestTimeout())
            }, HTTP_TIMEOUT)
        })
    }

    getSlave(wsClient, centralId, slaveId, mapDevice) {
        let headers = this.getHeaders(centralId)

        return new Promise((resolve, reject) => {
            fetch(`${this.protocol}://${this.server}/slaves/${slaveId}`, {
                method: 'GET',
                headers: headers,
                timeout: HTTP_TIMEOUT
            })
                .then((res) => this.checkStatus(res))
                .then((res) => res.json())
                .then((slave) => {
                    if (mapDevice) {
                        return resolve(slave)
                    }

                    return resolve(new HubotSlave(
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
                        slave.status,
                        slave['clamp_type'],
                        slave.aggregate
                    ))

                }).catch((err) => reject(err))

            setTimeout(() => {
                reject(new RequestTimeout())
            }, HTTP_TIMEOUT)
        })
    }

    getSlaves(wsClient, centralId, mapDevices) {
        let headers = this.getHeaders(centralId)

        return new Promise((resolve, reject) => {
            fetch(`${this.protocol}://${this.server}/slaves`, {
                method: 'GET',
                headers: headers,
                timeout: HTTP_TIMEOUT
            })
                .then((res) => this.checkStatus(res))
                .then((res) => res.json())
                .then((data) => {
                    if (mapDevices) {
                        return resolve(data)
                    }

                    return resolve(data.map((slave) => {
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
                            slave.status,
                            slave['clamp_type'],
                            slave.aggregate,
                            slave['temperature_correction'] || 0,
                            0,
                            slave.lastConsumption
                        )
                    }))
                }).catch((err) => reject(err))

            setTimeout(() => {
                reject(new RequestTimeout())
            }, HTTP_TIMEOUT)
        })
    }

    getDeviceRemotes(wsClient, centralId, deviceId) {
        let headers = this.getHeaders(centralId)

        return fetch(`${this.protocol}://${this.server}/devices/${deviceId}/remotes`, {
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
                'clamp_type': slave['clamp_type'],
                'aggregate': slave.aggregate,
                'temperature_correction': slave['temperature_correction']
            },
            'ambients': slave.ambients
        }

        return fetch(`${this.protocol}://${this.server}/slaves/${slave.id}`, {
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

        return fetch(`${this.protocol}://${this.server}/channels/${channel.id}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({
                id: channel.id,
                name: channel.name,
                type: channel.type,
                channel: channel.channel,
                sceneId: channel.sceneId
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

        return fetch(`${this.protocol}://${this.server}/channels/${id}`, {
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

        return fetch(`${this.protocol}://${this.server}/slaves/${id}`, {
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

        return fetch(`${this.protocol}://${this.server}/rfir_buttons/${button.id}`, {
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

        return fetch(`${this.protocol}://${this.server}/rfir_buttons`, {
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
            url = `${this.protocol}://${this.server}/consumption/${scope}/${api}/${from}/${to}`
        } else {
            url = `${this.protocol}://${this.server}/consumption/${scope}/${id}/${api}/${from}/${to}`
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

    getAuthHeaders() {
        return new Headers({
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        })
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
}
