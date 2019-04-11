import HubotHttpClient from './hubot_http_client.js'
import HubotWsClient from './hubot_ws_client.js'

// Models
import HubotChannel from './models/hubot_channel'
import HubotSlave from './models/hubot_slave'
import HubotScene from './models/hubot_scene'
import HubotIRRFDevice from './models/hubot_irrf'
import HubotRemote from './models/hubot_remote'
import HubotConsumption from './models/hubot_consumption'

import {
    ConnectionFailure,
    AuthenticationFailure,
    MaxRetriesFailure,
    NotAuthenticatedFailure,
    CentralNotFoundFailure,
    errorMap
} from './errors'

export {
    HubotHttpClient,
    HubotWsClient,
    HubotChannel,
    HubotSlave,
    HubotScene,
    HubotRemote,
    HubotIRRFDevice,
    HubotConsumption
}

export {
    ConnectionFailure,
    AuthenticationFailure,
    MaxRetriesFailure,
    NotAuthenticatedFailure,
    CentralNotFoundFailure,
    errorMap
}
