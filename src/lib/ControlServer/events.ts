/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2020 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *      Steven Oderayi - steven.oderayi@modusbox.com                       *
 **************************************************************************/

import { EventEmitter } from 'node:events';
import { PeerJwsItem, IConnectorConfig } from '../stateMachine/states/shared/types';
import logger from '../logger';

const log = logger.child({ component: 'ControlServer.events' });

/**************************************************************************
 * Internal events received by the control server via the exposed internal
 * event emitter.
 *************************************************************************/
export const INTERNAL_EVENTS = {
  SERVER: {
    BROADCAST_CONFIG_CHANGE: 'BROADCAST_CONFIG_CHANGE',
    BROADCAST_PEER_JWS_CHANGE: 'BROADCAST_PEER_JWS_CHANGE',
  },
};
const internalEventEmitter = new EventEmitter();

/**************************************************************************
 * getInternalEventEmitter
 *
 * Returns an EventEmitter that can be used to exchange internal events with
 * either the control server or the client from other modules within this service.
 * This prevents the need to pass down references to either the server or the client
 * from one module to another in order to use their interfaces.
 *
 * @returns {events.EventEmitter}
 *************************************************************************/
export const getInternalEventEmitter = () => {
  return internalEventEmitter;
};

export const changeConfig = (config?: IConnectorConfig) => {
  const eventName = INTERNAL_EVENTS.SERVER.BROADCAST_CONFIG_CHANGE
  log.info(`emit ws internal event ${eventName}: `, { configFields: Object.keys(config || {}) });
  internalEventEmitter.emit(eventName, config);
};

export const notifyPeerJWS = (peerJWS?: PeerJwsItem[]) => {
  const eventName = INTERNAL_EVENTS.SERVER.BROADCAST_PEER_JWS_CHANGE
  log.info(`emit ws internal event ${eventName} with new publicKeys: `, {
    peerJWS: (peerJWS || []).map(({ createdAt, dfspId, validationState }) => ({ createdAt, dfspId, validationState }))
  });
  internalEventEmitter.emit(eventName, peerJWS);
};
