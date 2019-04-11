import HubotProtocol from './hubot_protocol'

export default class HubotChannelProtocol extends HubotProtocol {
    constructor() {
        super()
    }

    /* Ex:
     * {
     *     'type': 'slave',
     *     'id': 5,
     *     'command': 'light_control',
     *     'channel': 2,
     *     'value': 100
     * }
     */
    static lightControl(slaveId, channel, value) {
        return {
            'type': 'slave',
            'id': slaveId,
            'command': 'light_control',
            'channel': channel,
            'value': value
        }
    }

    /* Ex:
     * {
     *     'type': 'slave',
     *     'id': 2,
     *     'command': 'light_dimmer',
     *     'channel': 2,
     *     'value': 100
     * }
     */
    static lightDimmer(slaveId, channel, value) {
        return {
            'type': 'slave',
            'id': slaveId,
            'command': 'light_dimmer',
            'channel': channel,
            'value': value
        }
    }

    /* Ex:
     * {
     *     'type': 'slave',
     *     'id': 5,
     *     'command': 'rgb_control',
     *     'rgb': [57, 20, 55]
     * }
     */
    static rgbControl() {}

    /* Ex:
     * {
     *     'type': 'slave',
     *     'id': 5,
     *     'command': 'rgb_dimmer',
     *     'rgb': [57, 20, 55]
     * }
     */
    static rgbDimmer() {}
}
