/* eslint-disable */
// TODO: Remove previous line and work through linting issues at next edit

/** ************************************************************************
 *  (C) Copyright ModusBox Inc. 2020 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Jose Sanchez - jose.sanchez@modusbox.com                   *
 ************************************************************************* */

const ControlServer = require('../ControlServer');

class ConnectorModel {
    constructor(opts) {
        this._storage = opts.storage;
        this._logger = opts.logger;
        this._wsUrl = opts.wsUrl;
        this._wsPort = opts.wsPort;
        this._dfspCaPath = opts.dfspCaPath;
        this._tlsServerPrivateKey = opts.tlsServerPrivateKey;
    }

    async reconfigureInboundSdk(csrPrivateKey, inServerCert, dfspCA) {
        const logger = this._logger;

        logger.info(`About to reconfigure sdk through websocket ${this._wsUrl} and port ${this._wsPort} `);

        const client = await ControlServer.Client.Create({
            address: this._wsUrl,
            port: this._wsPort,
            logger,
        });
        logger.verbose('client for websocket created');

        const clientSendResponse = await client.send(ControlServer.build.CONFIGURATION.READ());
        logger.debug('client send returned :: ', clientSendResponse);

        const responseRead = await client.receive();
        logger.debug('client receive returned :: ', responseRead);

        const appConfig = responseRead.data;

        const changedConfig = {
            ...appConfig,
            inbound: {
                ...appConfig.inbound,
                tls: {
                    ...appConfig.inbound.tls,
                    creds: {
                        ca: [Buffer.from(dfspCA)],
                        cert: Buffer.from(inServerCert),
                        key: Buffer.from(csrPrivateKey),

                    },
                },
            },
        };

        await client.send(ControlServer.build.CONFIGURATION.PATCH({}, changedConfig));
    }

    async reconfigureOutboundSdk(rootHubCA, key, certificate) {
        const logger = this._logger;

        const client = await ControlServer.Client.Create({
            address: this._wsUrl,
            port: 4003,
            logger,
        });

        await client.send(ControlServer.build.CONFIGURATION.READ());
        const responseRead = await client.receive();

        const appConfig = responseRead.data;

        const changedConfig = {
            ...appConfig,
            outbound: {
                ...appConfig.outbound,
                tls: {
                    ...appConfig.outbound.tls,
                    creds: {
                        ca: Buffer.from(rootHubCA, 'utf8'),
                        cert: Buffer.from(certificate, 'utf8'),
                        key: Buffer.from(key, 'utf8'),
                    },
                },
            },
        };

        await client.send(ControlServer.build.CONFIGURATION.PATCH({}, changedConfig));

        await client.receive();
    }
}

module.exports = ConnectorModel;
