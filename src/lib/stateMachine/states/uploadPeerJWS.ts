/** ************************************************************************
 *  (C) Copyright Mojaloop Foundation 2022                                *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Vijay Kumar Guthi <vijaya.guthi@infitx.com>                   *
 ************************************************************************* */

import { AnyEventObject, assign, DoneEventObject, MachineConfig, send } from 'xstate';
import { PeerJwsItem } from './shared/types';
import { compareAndUpdateJWS } from './shared/compareAndUpdateJWS';
import { MachineOpts } from './MachineOpts';
import { invokeRetry } from './invokeRetry';

type JWS = PeerJwsItem;

export namespace UploadPeerJWS {
  export interface Context {
    peerJWS?: JWS[];
  }

  type UpdateAction = { type: 'UPLOAD_PEER_JWS'; peerJWS: JWS[] };

  export type Event =
    | UpdateAction
    | DoneEventObject
    | { type: 'UPLOAD_PEER_JWS_IDLE' }
    | { type: 'COMPARING_PEER_JWS' }
    | { type: 'UPLOADING_PEER_JWS' };

  export const createState = <TContext extends Context>(opts: MachineOpts): MachineConfig<TContext, any, Event> => ({
    id: 'uploadPeerJWS',
    initial: 'idle',
    on: {
      UPLOAD_PEER_JWS: { target: '.comparePeerJWS', internal: false },
    },
    states: {
      idle: {
        entry: send('UPLOAD_PEER_JWS_IDLE'),
      },
      comparePeerJWS: {
        entry: send('COMPARING_UPLOAD_PEER_JWS'),
        invoke: {
          src: async (context, event: AnyEventObject) => compareAndUpdateJWS(
            event.data,
            context.peerJWS,
            opts.logger.child({ machine: 'UPLOAD_PEER_JWS' })
          ),
          onDone: {
            target: 'uploadingPeerJWS',
          },
          onError: {
            target: 'idle',
            actions: [
              (ctx, event) => opts.logger.warn('failed to compare peer JWS during upload: ', event.data),
            ],
          },
        },
      },
      uploadingPeerJWS: {
        entry: send('UPLOADING_PEER_JWS'),
        invoke: {
          id: 'uploadingPeerJWS',
          src: (_ctx, event: AnyEventObject) =>
            invokeRetry({
              id: 'uploadingPeerJWS',
              logger: opts.logger,
              retryInterval: opts.refreshIntervalSeconds * 1000,
              machine: 'UPLOAD_PEER_JWS',
              state: 'uploadingPeerJWS',
              service: async () => {
                const log = opts.logger.child({ machine: 'UPLOAD_PEER_JWS', state: 'uploadingPeerJWS' });
                const changesToUpload = event.data.changes.map(({ dfspId, publicKey, createdAt }) => {
                  return {
                    dfspId,
                    publicKey,
                    createdAt,
                  };
                });
                try {
                  await opts.dfspCertificateModel.uploadExternalDfspJWS(changesToUpload);
                  log.verbose('uploadingPeerJWS is done');
                  return event.data;
                } catch (error) {
                  log.error('error in uploadingPeerJWS: ', error);
                  throw error;
                }
              },
            }),
          onDone: {
            target: 'idle',
            actions: [assign({ peerJWS: (_context, event) => event.data.updatedPeerJWS }), send('UPLOAD_PEER_JWS_COMPLETED')],
          },
          onError: {
            target: 'idle',
          },
        },
      },
    },
  });
}
