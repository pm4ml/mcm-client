/** ************************************************************************
 *  (C) Copyright Mojaloop Foundation 2022                                *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Vijay Kumar Guthi <vijaya.guthi@infitx.com>                   *
 ************************************************************************* */

import { AnyEventObject, assign, DoneEventObject, MachineConfig } from 'xstate';
import { MachineOpts } from './MachineOpts';
import { invokeRetry } from './invokeRetry';
import { PeerJWS } from './peerJWS';
import _ from 'lodash';

type JWS = PeerJWS.JWS;

export namespace PeerJWSNotify {
  export interface Context {
    peerJWS?: JWS[];
  }

  type UpdateAction =
    | { type: 'UPDATE_PEER_JWS'; peerJWS: JWS[] }
    | { type: 'REQUEST_PEER_JWS' };

  export type Event = UpdateAction | DoneEventObject;

  export const createState = <TContext extends Context>(opts: MachineOpts): MachineConfig<TContext, any, Event> => ({
    id: 'connectorConfig',
    initial: 'idle',
    on: {
      UPDATE_PEER_JWS: { target: '.updatingPeerJWS', internal: false },
      REQUEST_PEER_JWS: { target: '.propagatingPeerJWS', internal: false },
    },
    states: {
      idle: {},
      updatingPeerJWS: {
        entry: assign({
          peerJWS: (_ctx: TContext, event: AnyEventObject) => event.peerJWS,
        }) as any,
        always: {
          target: 'propagatingPeerJWS',
        },
      },
      propagatingPeerJWS: {
        invoke: {
          id: 'propagatePeerJWS',
          src: (ctx) =>
            invokeRetry({
              id: 'propagatePeerJWS',
              logger: opts.logger,
              retryInterval: opts.refreshIntervalSeconds * 1000,
              machine: 'peerJWSNotify',
              state: 'propagatingPeerJWS',
              service: async () => opts.ControlServer.notifyPeerJWS(ctx.peerJWS),
            }),
          onDone: {
            target: 'idle',
          },
        },
      },
    },
  });
}
