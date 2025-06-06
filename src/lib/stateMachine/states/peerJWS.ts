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
          src: async (context: Context, event: DoneEventObject & { data?: JWS[] }) => {
            const peerJWS = event.data as JWS[];

            // Deduplicate: keep only the latest JWS per dfspId
            const latestJWSMap = new Map<string, JWS>();
            for (const jws of peerJWS) {
              const existing = latestJWSMap.get(jws.dfspId);
              if (!existing || jws.createdAt > existing.createdAt) {
                latestJWSMap.set(jws.dfspId, jws);
              }
            }
            const dedupedPeerJWS = Array.from(latestJWSMap.values());

            // Compare with context.peerJWS (also deduped)
            const prevJWSMap = new Map<string, JWS>();
            if (context.peerJWS) {
              for (const jws of context.peerJWS) {
                const existing = prevJWSMap.get(jws.dfspId);
                if (!existing || jws.createdAt > existing.createdAt) {
                  prevJWSMap.set(jws.dfspId, jws);
                }
              }
            }
            const prevDedupedPeerJWS = Array.from(prevJWSMap.values());

            // Find changes (new or updated keys)
            const changes = _.differenceWith(
              dedupedPeerJWS,
              prevDedupedPeerJWS,
              (a, b) => a.dfspId === b.dfspId && a.publicKey === b.publicKey && a.createdAt === b.createdAt
            );

            // Update context with deduped latest JWS
            const updatedPeerJWS = dedupedPeerJWS;

            return { changes, updatedPeerJWS };
          },
          onDone: {
            target: 'notifyPeerJWS',
            actions: [
              assign({ peerJWS: (_context, event: any) => event.data.updatedPeerJWS }),
              send((_context, event: any) => {
                const peerJWSKeys = Object.fromEntries(
                  (event.data.updatedPeerJWS as JWS[]).map((e: JWS) => [e.dfspId, e.publicKey])
                );
                return { type: 'UPDATE_CONNECTOR_CONFIG', config: { peerJWSKeys } };
              }),
            ],
          },
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

  //   peerJWSChanged: (context: TContext, event: AnyEventObject) => stringify(event.data) !== stringify(context.peerJWS),
  // });
}
