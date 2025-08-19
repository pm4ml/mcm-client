import ws from 'ws';
import SDKStandardComponents from '@mojaloop/sdk-standard-components';

import Logger = SDKStandardComponents.Logger.SdkLogger;

import { build, serialise, deserialise } from './shared';


/** ************************************************************************
 * Client
 *
 * The Control Client. Client for the websocket control API.
 * Used to hot-restart the SDK.
 *
 * logger    - Logger- see SDK logger used elsewhere
 * address   - address of control server
 * port      - port of control server
 ************************************************************************ */
class Client extends ws {
    private _logger: Logger;

    constructor({ address = 'localhost', port, logger }) {
        super(`ws://${address}:${port}`);
        this._logger = logger;
    }

    // Really only exposed so that a user can import only the client for convenience
    get Build() {
        return build;
    }

    static async Create({ address = 'localhost', port, logger }) {
        const result = new Client({ address, port, logger });
        await new Promise((resolve, reject) => {
            result.on('open', resolve);
            result.on('error', reject);
        });
        return result;
    }

    async send(msg) {
        const data = typeof msg === 'string' ? msg : serialise(msg);
        this._logger.log('Send msg as a client through websocket : ', data);
        this._logger.log('Websocket client information : ', this.url);
        return new Promise<Error | undefined>((resolve) => super.send(data, resolve));
    }

    // Receive a single message
    async receive() {
        return new Promise((resolve) => this.once('message', (data) => {
            const deserialiseMessage = deserialise(data[0]);
            resolve(deserialiseMessage);
        }));
    }
}

export {
    Client,
}
