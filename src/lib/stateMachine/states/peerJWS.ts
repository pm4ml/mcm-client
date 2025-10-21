/**************************************************************************
 *  (C) Copyright Mojaloop Foundation 2022                                *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha <yevhen.kyriukha@modusbox.com>                   *
 **************************************************************************/

import _ from 'lodash';
import { AnyEventObject, assign, DoneEventObject, MachineConfig, send } from 'xstate';
import { PeerJwsItem } from './shared/types';
import { NoPeerJwsChangesError } from './shared/errors';
import { compareAndUpdateJWS } from './shared/compareAndUpdateJWS';
import { MachineOpts } from './MachineOpts';
import { invokeRetry } from './invokeRetry';

export namespace PeerJWS {
  export type JWS = PeerJwsItem;

  export type Context = {
    peerJWS?: JWS[];
  };

  export type Event =
    | DoneEventObject
    | { type: 'PEER_JWS_CONFIGURED' }
    | { type: 'FETCHING_PEER_JWS' }
    | { type: 'COMPARING_PEER_JWS' }
    | { type: 'NOTIFYING_PEER_JWS' }
    | { type: 'COMPLETING_PEER_JWS' };

  export const createState = <TContext extends Context>(opts: MachineOpts): MachineConfig<TContext, any, Event> => ({
    id: 'getPeerJWS',
    initial: 'fetchingPeerJWS',
    on: {
      REQUEST_PEER_JWS: { target: '.notifyPeerJWS', internal: false },
    },
    states: {
      fetchingPeerJWS: {
        entry: send('FETCHING_PEER_JWS'),
        invoke: {
          id: 'getPeerDFSPJWSCertificates',
          src: () =>
            invokeRetry({
              id: 'getPeerDFSPJWSCertificates',
              logger: opts.logger,
              retryInterval: opts.refreshIntervalSeconds * 1000,
              machine: 'PEER_JWS',
              state: 'fetchingPeerJWS',
              service: async () => opts.dfspCertificateModel.getAllJWSCertificates(),
            }),
          onDone: 'comparePeerJWS',
        },
      },
      comparePeerJWS: {
        entry: send('COMPARING_PEER_JWS'),
        invoke: {
          src: async (context, event: AnyEventObject) => compareAndUpdateJWS(
            event.data,
            context.peerJWS,
            opts.logger.child({ machine: 'PEER_JWS' })
          ),
          onDone: {
            target: 'notifyPeerJWS',
            actions: [
              assign({ peerJWS: (_context, event) => event.data.updatedPeerJWS }),
              send((_context, event) => {
                const peerJWSKeys = Object.fromEntries(event.data.updatedPeerJWS.map((e) => [e.dfspId, e.publicKey]));
                return { type: 'UPDATE_CONNECTOR_CONFIG', config: { peerJWSKeys } };
              }),
            ],
          },
          onError: {
            target: 'completed',
            actions: [
              (ctx, event) => {
                if (!(event.data instanceof NoPeerJwsChangesError)) {
                  opts.logger.warn('failed to compare peer JWS: ', event.data)
                }
              },
              send('NO_PEER_JWS_CHANGES'),
            ],
          },
        },
      },
      notifyPeerJWS: {
        entry: send('NOTIFYING_PEER_JWS'),
        invoke: {
          id: 'notifyPeerJWS',
          src: (ctx: TContext) =>
            invokeRetry({
              id: 'notifyPeerJWS',
              logger: opts.logger,
              retryInterval: opts.refreshIntervalSeconds * 1000,
              machine: 'PEER_JWS',
              state: 'notifyPeerJWS',
              service: async () => opts.ControlServer.notifyPeerJWS(ctx.peerJWS),
            }),
          onDone: {
            target: 'completed',
          },
        },
      },
      completed: {
        entry: send('COMPLETING_PEER_JWS'),
        always: {
          target: 'retry',
          actions: send('PEER_JWS_CONFIGURED'),
        },
      },
      retry: {
        after: {
          [opts.refreshIntervalSeconds * 1000]: { target: 'fetchingPeerJWS' },
        },
      },
    },
  });

  export const createGuards = <TContext extends Context>() => ({
    peerJWSChanged: (context: TContext, event: AnyEventObject) => !_.isEqual(event.data, context.peerJWS),
  });

  // export const createActions = <TContext extends Context>() => ({
  //   peerJWSChanged: (context: TContext, event: AnyEventObject) => stringify(event.data) !== stringify(context.peerJWS),
  // });
}
