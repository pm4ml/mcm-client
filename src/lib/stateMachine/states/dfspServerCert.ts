/** ************************************************************************
 *  (C) Copyright Mojaloop Foundation 2022                                *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha <yevhen.kyriukha@modusbox.com>                   *
 ************************************************************************* */

import { assign, AnyEventObject, DoneEventObject, MachineConfig, send } from 'xstate';
import { CsrParams } from '../../vault';
import { MachineOpts } from './MachineOpts';
import { invokeRetry } from './invokeRetry';
import { DfspCA } from './dfspCA';

jest.setTimeout(50000);

const DEFAULT_CERT_EXPIRY_THRESHOLD_DAYS = 2;

export namespace DfspServerCert {
  export interface Context {
    dfspServerCert?: {
      rootCertificate?: string;
      intermediateChain?: string;
      serverCertificate?: string;
      privateKey?: string;
      expiration?: number;
    };
  }

  type CreateDfspServerCertEvent = { type: 'CREATE_DFSP_SERVER_CERT'; csr: CsrParams };
  export type Event =
    | DoneEventObject
    | { type: 'DFSP_SERVER_CERT_CONFIGURED' }
    | CreateDfspServerCertEvent
    | DfspCA.Event
    | { type: 'DFSP_SERVER_CERT_IDLE' }
    | { type: 'REQUESTING_NEW_DFSP_SERVER_CERT' }
    | { type: 'RENEWING_MANAGED_DFSP_SERVER_CERT' }
    | { type: 'CREATING_DFSP_SERVER_CERT' }
    | { type: 'UPLOADING_DFSP_SERVER_CERT_TO_HUB' }
    | { type: 'CHECKING_DFSP_SERVER_CERT' }
    | { type: 'DFSP_SERVER_CERT_EXPIRING' }
    | { type: 'DFSP_SERVER_CERT_EXPIRED' };

  export const createState = <TContext extends Context>(opts: MachineOpts): MachineConfig<TContext, any, Event> => ({
    id: 'dfspServerCert',
    initial: 'idle',
    on: {
      CREATE_DFSP_SERVER_CERT: { target: '.requestedNewDfspServerCert', internal: false },
      DFSP_CA_PROPAGATED: { target: '.requestedNewDfspServerCert', internal: false },
    },
    states: {
      idle: {
        always: [
          { target: 'checkingDfspServerCert', cond: 'notManagedByCertManager' },
        ],
      },
      checkingDfspServerCert: {
        entry: send('CHECKING_DFSP_SERVER_CERT'),
        invoke: {
          id: 'checkDfspServerCert',
          src: (ctx) =>
            invokeRetry({
              id: 'checkDfspServerCert',
              logger: opts.logger,
              retryInterval: opts.refreshIntervalSeconds * 1000,
              machine: 'DFSP_SERVER_CERT',
              state: 'checkingDfspServerCert',
              service: async () => {
                if(ctx.dfspServerCert) {
                  return ctx.dfspServerCert;
                } else {
                  throw new Error('No DFSP Server Certificate found');
                }
              },
            }),
          onDone: [
            {
              target: 'expiredDfspServerCert',
              cond: 'isDfspServerCertExpired',
            },
            {
              target: 'expiringDfspServerCert',
              cond: 'isDfspServerCertExpiring',
            },
            {
              target: 'scheduledExpiryCheck',
            },
          ],
        },
      },
      expiringDfspServerCert: {
        entry: send('DFSP_SERVER_CERT_EXPIRING'),
        always: [
          { target: 'creatingDfspServerCert' },
        ],
      },
      expiredDfspServerCert: {
        entry: send('DFSP_SERVER_CERT_EXPIRED'),
        always: [
          { target: 'creatingDfspServerCert' },
        ],
      },
      scheduledExpiryCheck: {
        after: {
          [opts.refreshIntervalSeconds * 1000]: { target: 'checkingDfspServerCert' },
        },
      },
      requestedNewDfspServerCert: {
        entry: send('REQUESTING_NEW_DFSP_SERVER_CERT'),
        always: [
          { target: 'renewingManagedDfspServerCert', cond: 'managedByCertManager' },
          { target: 'creatingDfspServerCert' },
        ],
      },
      renewingManagedDfspServerCert: {
        entry: send('RENEWING_MANAGED_DFSP_SERVER_CERT'),
        invoke: {
          id: 'renewManagedDfspServerCert',
          src: () =>
            invokeRetry({
              id: 'renewManagedDfspServerCert',
              logger: opts.logger,
              retryInterval: opts.refreshIntervalSeconds * 1000,
              machine: 'DFSP_SERVER_CERT',
              state: 'renewingManagedDfspServerCert',
              service: async () => {
                return await opts.certManager!.renewServerCert();
              },
            }),
          onDone: {
            target: 'idle',
            actions: send('DFSP_SERVER_CERT_CONFIGURED'),
          },
        },
      },
      creatingDfspServerCert: {
        entry: send('CREATING_DFSP_SERVER_CERT'),
        invoke: {
          id: 'createDFSPServerCert',
          src: (ctx, event) =>
            invokeRetry({
              id: 'createDFSPServerCert',
              logger: opts.logger,
              retryInterval: opts.refreshIntervalSeconds * 1000,
              machine: 'DFSP_SERVER_CERT',
              state: 'creatingDfspServerCert',
              service: async () =>
                opts.vault.createDFSPServerCert(
                  (event as CreateDfspServerCertEvent).csr || opts.config.dfspServerCsrParameters
                ),
            }),
          onDone: {
            actions: [
              assign({
                dfspServerCert: (ctx, { data }) => data,
              }),
              send((ctx) => ({
                type: 'UPDATE_CONNECTOR_CONFIG',
                config: {
                  inbound: {
                    tls: {
                      creds: {
                        ca: ctx.dfspServerCert!.rootCertificate,
                        cert: ctx.dfspServerCert!.serverCertificate,
                        key: ctx.dfspServerCert!.privateKey,
                      },
                    },
                  },
                },
              })),
              send('DFSP_SERVER_CERT_CONFIGURED'),
            ],
            target: 'scheduledExpiryCheck',
          },
        },
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export const createGuards = <TContext extends Context>(opts: MachineOpts) => ({
    managedByCertManager: () => !!opts.certManager,
    notManagedByCertManager: () => !opts.certManager,
    isDfspServerCertExpiring: (_ctx: TContext, event: AnyEventObject) => {
      // Check if certificate is expiring
      if (event.data?.expiration) {
        const expiryDate = new Date(event.data.expiration * 1000);
        const now = new Date();
        const thresholdDays = opts.certExpiryThresholdDays ?? DEFAULT_CERT_EXPIRY_THRESHOLD_DAYS;
        const thresholdDate = new Date(now.getTime() + thresholdDays * 24 * 60 * 60 * 1000);
        return expiryDate <= thresholdDate;
      }
      return false;
    },
    isDfspServerCertExpired: (_ctx: TContext, event: AnyEventObject) => {
      // Check if certificate is expired
      if (event.data?.expiration) {
        const expiryDate = new Date(event.data.expiration * 1000);
        return expiryDate <= new Date();
      }
      return false;
    },
  });
}
