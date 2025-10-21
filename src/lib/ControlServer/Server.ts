/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2020 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Matt Kingston - matt.kingston@modusbox.com                       *
 **************************************************************************/

import ws from 'ws';
import { Logger } from '@mojaloop/sdk-standard-components';

const { randomPhrase } = require('@mojaloop/sdk-standard-components');
import { getInternalEventEmitter, INTERNAL_EVENTS } from './events';

import { MESSAGE, VERB, ERROR, build, deserialise, getWsIp } from './shared';

const HEARTBEAT_INTERVAL = 30_000;

const ControlServerEventEmitter = getInternalEventEmitter();



/**************************************************************************
 * Server
 *
 * The Control Server. Exposes a websocket control API.
 * Used to hot-restart the SDK.
 *
 * logger    - Logger- see SDK logger used elsewhere
 * port      - HTTP port to host on
 * appConfig - The configuration for the entire application- supplied here as this class uses it to
 *             validate reconfiguration requests- it is not used for configuration here, however
 * server    - optional HTTP/S server on which to serve the websocket
 *************************************************************************/

export interface ServerOpts {
  logger: Logger.SdkLogger;
  port: number;
  onRequestConfig: (client: unknown) => void;
  onRequestPeerJWS: (client: unknown) => void;
  onUploadPeerJWS: (client: unknown) => void;
}

class Server extends ws.Server {
  private _logger: Logger.SdkLogger;
  private _clientData: Map<any, any>;
  private _heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly onRequestConfig: (client: unknown) => void;
  private readonly onRequestPeerJWS: (client: unknown) => void;
  private readonly onUploadPeerJWS: (client: unknown) => void;

  constructor(opts: ServerOpts) {
    super({ clientTracking: true, port: opts.port });

    this._logger = opts.logger;
    this._clientData = new Map();
    this.onRequestConfig = opts.onRequestConfig;
    this.onRequestPeerJWS = opts.onRequestPeerJWS;
    this.onUploadPeerJWS = opts.onUploadPeerJWS;

    this.on('error', (err) => {
      this._logger.error('Unhandled websocket error occurred. Shutting down.', err);
      process.exit(1); // todo: do we need to process.exit() here?
    });

    this.on('connection', (socket, req) => {
      const logger = this._logger.push({
        url: req.url,
        ip: getWsIp(req),
        remoteAddress: req.socket.remoteAddress,
      } as any);
      logger.verbose('Websocket connection received');
      this._clientData.set(socket, { ip: req.connection.remoteAddress, logger, isAlive: true });

      socket.on('pong', () => {
        const clientData = this._clientData.get(socket);
        if (clientData) {
          clientData.isAlive = true;
        }
      });

      socket.on('close', (code, reason) => {
        logger.warn('Websocket connection closed', { code, reason });
        this._clientData.delete(socket);
      });

      socket.on('message', this._handle(socket, logger));
    });
    this._logger.info(`ws Control Server is running...`, { addressInfo: this.address(), HEARTBEAT_INTERVAL });
    this._startHeartbeat();
  }

  private _startHeartbeat() {
    this._heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        const clientData = this._clientData.get(client);
        if (clientData && !clientData.isAlive) {
          client.terminate();
          this._clientData.delete(client);
          return;
        }
        if (clientData) {
          clientData.isAlive = false;
        }
        client.ping();
      });
    }, HEARTBEAT_INTERVAL);
  }

  private _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
  }

  // Close the server then wait for all the client sockets to close
  async stop() {
    this._stopHeartbeat();
    const closing = new Promise((resolve) => this.close(resolve));
    for (const client of this.clients) {
      client.terminate();
    }
    await closing;
    this._logger.info('Control server shutdown complete');
  }

  _handle(client, logger: Logger.SdkLogger) {
    return (data: any) => {
      // TODO: json-schema validation of received message- should be pretty straight-forward
      // and will allow better documentation of the API
      let msg;
      try {
        msg = deserialise(data);
      } catch (err) {
        logger.push({ data }).warn("Couldn't parse received message");
        client.send(build.ERROR.NOTIFY.JSON_PARSE_ERROR());
      }
      logger.push({ msg }).debug('Handling received message');

      if (!msg) {
        logger.warn('No deserialised WS message');
        return;
      }

      switch (msg.msg) {
        case MESSAGE.CONFIGURATION:
          switch (msg.verb) {
            case VERB.READ:
              this.onRequestConfig(client);
              break;
            default:
              client.send(build.ERROR.NOTIFY.UNSUPPORTED_VERB(msg.id));
              break;
          }
          break;
        case MESSAGE.PEER_JWS:
          switch (msg.verb) {
            case VERB.READ:
              this.onRequestPeerJWS(client);
              break;
            case VERB.NOTIFY:
              this.onUploadPeerJWS(msg.data);
              break;
            default:
              client.send(build.ERROR.NOTIFY.UNSUPPORTED_VERB(msg.id));
              break;
          }
          break;
        case MESSAGE.ERROR:
          logger.push({ msg }).warn('Received error message');
          break;
        default:
          client.send(build.ERROR.NOTIFY.UNSUPPORTED_MESSAGE(msg.id));
          break;
      }
    };
  }

  /**
   * Register this server instance to receive internal server messages
   * from other modules.
   */
  registerInternalEvents() {
    ControlServerEventEmitter.on(INTERNAL_EVENTS.SERVER.BROADCAST_CONFIG_CHANGE, (params) =>
      this.broadcastConfigChange(params)
    );
    ControlServerEventEmitter.on(INTERNAL_EVENTS.SERVER.BROADCAST_PEER_JWS_CHANGE, (params) =>
      this.broadcastPeerJWS(params)
    );
  }

  /**
   * Broadcast configuration change to all connected clients.
   */
  broadcastConfigChange(updatedConfig) {
    const updateConfMsg = build.CONFIGURATION.NOTIFY(updatedConfig, randomPhrase());
    return this.broadcast(updateConfMsg);
  }

  /**
   * Broadcast configuration change to all connected clients.
   */
  broadcastPeerJWS(peerJWS) {
    const notificationMsg = build.PEER_JWS.NOTIFY(peerJWS, randomPhrase());
    return this.broadcast(notificationMsg);
  }

  /**
   * Broadcasts a protocol message to all connected clients.
   *
   * @param {string} msg
   */
  broadcast(msg: string) {
    this.clients.forEach((client) => {
      if (client.readyState === ws.WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  /**
   * Outputs details about all connected clients.
   */
  getClientDetails() {
    const clientDetails = Array.from(this._clientData.entries()).map(([client, data]) => ({
      ip: data.ip,
      isAlive: data.isAlive,
      readyState: client.readyState,
    }));
    this._logger.debug('Connected client details: ', { clientDetails });
    return clientDetails;
  }

  /**
   * Health check function to verify the server is running and clients are responsive.
   */
  healthCheck() {
    const clientDetails = this.getClientDetails();
    const unhealthyClients = clientDetails.filter((client) => !client.isAlive);

    const status = {
      server: {
        running: true,
        port: this.options.port,
      },
      clients: {
        total: clientDetails.length,
        healthy: clientDetails.length - unhealthyClients.length,
        unhealthy: unhealthyClients.length,
      },
    };

    this._logger.debug('Health check status:', { status });
    return status;
  }
}

export { Server, build, MESSAGE, VERB, ERROR };
