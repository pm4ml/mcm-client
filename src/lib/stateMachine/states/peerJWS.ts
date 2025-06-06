/**************************************************************************
 *  (C) Copyright Mojaloop Foundation 2022                                *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha <yevhen.kyriukha@modusbox.com>                   *
 **************************************************************************/

import { AnyEventObject, assign, DoneEventObject, MachineConfig, send } from 'xstate';
import { MachineOpts } from './MachineOpts';
import { invokeRetry } from './invokeRetry';
import _ from 'lodash';
import { ProgressMonitor } from "./progressMonitor";

export namespace PeerJWS {
  export type JWS = {
    dfspId: string;
    publicKey: string;
    createdAt: number; // Unix timestamp
  };

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
              machine: ProgressMonitor.MachineName.PEER_JWS,
              state: 'fetchingPeerJWS',
              service: async () => opts.dfspCertificateModel.getAllJWSCertificates(),
            }),
          onDone: 'comparePeerJWS',
        },
      },
      comparePeerJWS: {
        entry: send('COMPARING_PEER_JWS'),
        invoke: {
          src: async (context: TContext, event: AnyEventObject) => {
            const peerJWS = event.data as JWS[];
            const changes = _.differenceWith(
              peerJWS,
              context.peerJWS ?? [],
              (a: JWS, b: JWS) => a.dfspId === b.dfspId && a.createdAt <= b.createdAt
            );
            if (changes.length === 0) {
              // No changes detected, return a flag
              return { changes: [], updatedPeerJWS: context.peerJWS ?? [], noChanges: true };
            }
            // Iterate through changes array and replace those values in the context with the new values
            // Clone the context.peerJWS array
            const updatedPeerJWS = context.peerJWS ? _.cloneDeep(context.peerJWS) : [];

            changes.forEach((change: JWS) => {
              const index = updatedPeerJWS.findIndex((jws: JWS) => jws.dfspId === change.dfspId);
              if (index === -1) {
                updatedPeerJWS.push(change);
              } else {
                updatedPeerJWS[index] = change;
              }
            });
            return { changes, updatedPeerJWS, noChanges: false };
          },
          onDone: [
            {
              target: 'completed',
              cond: (_context, event) => event.data.noChanges,
              actions: send('NO_PEER_JWS_CHANGES'),
            },
            {
              target: 'notifyPeerJWS',
              actions: [
                assign({ peerJWS: (_context, event) => event.data.updatedPeerJWS }),
                send((_context, event) => {
                  const peerJWSKeys = Object.fromEntries(
                    event.data.updatedPeerJWS.map((e: JWS) => [e.dfspId, e.publicKey])
                  );
                  return { type: 'UPDATE_CONNECTOR_CONFIG', config: { peerJWSKeys } };
                }),
              ],
            },
          ],
          onError: {
            target: 'completed',
            actions: send('NO_PEER_JWS_CHANGES'),
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
              machine: ProgressMonitor.MachineName.PEER_JWS,
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
