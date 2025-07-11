/** ************************************************************************
 *  (C) Copyright Mojaloop Foundation 2022                                *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha <yevhen.kyriukha@modusbox.com>                   *
 ************************************************************************* */

import { assign, DoneEventObject, MachineConfig, send } from 'xstate';
import { MachineOpts } from './MachineOpts';
import { invokeRetry } from './invokeRetry';
import _ from 'lodash';

export namespace EndpointConfig {
  export type Context = {
    endpointConfig?: {
      ips: string[];
      callbackURL: string;
    };
  };

  export type Event = DoneEventObject | { type: 'IP_ENDPOINT_CONFIGURED' };

  export const createState = <TContext extends Context>(opts: MachineOpts): MachineConfig<TContext, any, Event> => ({
    id: 'endpointConfig',
    initial: 'checkingChanges',
    states: {
      checkingChanges: {
        always: [
          {
            cond: 'configChanged',
            actions: assign({
              endpointConfig: () => ({
                callbackURL: opts.config.callbackURL,
                ips: opts.config.whitelistIP,
              }),
            }) as any,
            target: 'propagatingEndpointConfig',
          },
          { target: 'completed' },
        ],
      },
      propagatingEndpointConfig: {
        type: 'parallel',
        states: {
          uploadingWhitelistIP: {
            invoke: {
              id: 'uploadIPWhitelist',
              src: (ctx) =>
                invokeRetry({
                  id: 'uploadIPWhitelist',
                  logger: opts.logger,
                  retryInterval: opts.refreshIntervalSeconds * 1000,
                  machine: 'ENDPOINT_CONFIG',
                  state: 'propagatingEndpointConfig',
                  service: async () =>
                    opts.dfspEndpointModel.create({
                      direction: 'EGRESS',
                      // TODO: Replace with the following line when MCM API changes ready
                      // ipList: ctx.endpointConfig?.ips,
                      ipList: ctx.endpointConfig?.ips.map((ip) => ({ address: ip, ports: ['443'] })),
                    }),
                }),
              onDone: '.completed',
            },
            initial: 'processing',
            states: {
              processing: {},
              completed: { type: 'final' },
            },
          },
          uploadingCallbackURL: {
            invoke: {
              id: 'uploadCallbackURL',
              src: (ctx) =>
                invokeRetry({
                  id: 'uploadCallbackURL',
                  logger: opts.logger,
                  retryInterval: opts.refreshIntervalSeconds * 1000,
                  machine: 'ENDPOINT_CONFIG',
                  state: 'uploadingCallbackURL',
                  service: async () =>
                    opts.dfspEndpointModel.create({
                      direction: 'INGRESS',
                      url: ctx.endpointConfig?.callbackURL,
                    }),
                }),
              onDone: '.completed',
            },
            initial: 'processing',
            states: {
              processing: {},
              completed: { type: 'final' },
            },
          },
        },
        onDone: {
          target: 'completed',
        },
      },
      completed: {
        always: {
          target: 'retry',
          actions: send('ENDPOINT_CONFIG_PROPAGATED'),
        },
      },
      retry: {
        after: {
          [opts.refreshIntervalSeconds * 1000]: { target: 'checkingChanges' },
        },
      },
    },
  });

  export const createGuards = <TContext extends Context>(opts: MachineOpts) => ({
    configChanged: (ctx: TContext) =>
      opts.config.callbackURL !== ctx.endpointConfig?.callbackURL ||
      !_.isEqual(opts.config.whitelistIP, ctx.endpointConfig?.ips),
  });
}
