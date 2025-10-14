/** ************************************************************************
 *  (C) Copyright Mojaloop Foundation 2022                                *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha <yevhen.kyriukha@modusbox.com>                   *
 ************************************************************************* */

import { assign, DoneEventObject, MachineConfig } from 'xstate';
import { invokeRetry } from './invokeRetry';
import { MachineOpts } from './MachineOpts';

export namespace ProgressMonitor {
  export enum ProgressState {
    PENDING = 'pending',
    IN_PROGRESS = 'inProgress',
    COMPLETED = 'completed',
    IN_ERROR = 'inError',
  }

  export interface ProgressMonitorEntry {
    status: ProgressState;
    lastUpdated: Date | null;
    retries?: number;
    error?: string;
    stateDescription?: string;
  }

  export enum MachineName {
    DFSP_SERVER_CERT = 'DFSP_SERVER_CERT',
    PEER_JWS = 'PEER_JWS',
    DFSP_JWS = 'DFSP_JWS',
    DFSP_CA = 'DFSP_CA',
    DFSP_CLIENT_CERT = 'DFSP_CLIENT_CERT',
    HUB_CA = 'HUB_CA',
    HUB_CERT = 'HUB_CERT',
    ENDPOINT_CONFIG = 'ENDPOINT_CONFIG',
    UPLOAD_PEER_JWS = 'UPLOAD_PEER_JWS',
  }

  export interface Context {
    progressMonitor?: Record<MachineName, ProgressMonitorEntry>;
  }

  type FailureErrorMessageEvent = {
    type: 'FAILED';
    machine: string;
    state: string;
    error: string;
    retries: number
  };

  export type Event = DoneEventObject | FailureErrorMessageEvent;

  // CSI-1865: Only track meaningful external state changes (completion events)
  // Note: Error events handled separately via FAILED event handler
  const eventToProgressMap: { [key: string]: { machine: MachineName; state: ProgressState.COMPLETED } } = {
    NEW_HUB_CA_FETCHED: { machine: MachineName.HUB_CA, state: ProgressState.COMPLETED },
    DFSP_CA_PROPAGATED: { machine: MachineName.DFSP_CA, state: ProgressState.COMPLETED },
    DFSP_CLIENT_CERT_CONFIGURED: { machine: MachineName.DFSP_CLIENT_CERT, state: ProgressState.COMPLETED },
    DFSP_SERVER_CERT_CONFIGURED: { machine: MachineName.DFSP_SERVER_CERT, state: ProgressState.COMPLETED },
    HUB_CLIENT_CERT_SIGNED: { machine: MachineName.HUB_CERT, state: ProgressState.COMPLETED },
    PEER_JWS_CONFIGURED: { machine: MachineName.PEER_JWS, state: ProgressState.COMPLETED },
    DFSP_JWS_PROPAGATED: { machine: MachineName.DFSP_JWS, state: ProgressState.COMPLETED },
    ENDPOINT_CONFIG_PROPAGATED: { machine: MachineName.ENDPOINT_CONFIG, state: ProgressState.COMPLETED },
    UPLOAD_PEER_JWS_COMPLETED: { machine: MachineName.UPLOAD_PEER_JWS, state: ProgressState.COMPLETED },
  };

  export const handleProgressChanges = (ctx: Context, event: Event) => {
    const completionEvent = eventToProgressMap[event.type];
    // CSI-1865: skip intermediate events not in map
    if (!completionEvent) return ctx.progressMonitor!;

    return {
      ...ctx.progressMonitor!,
      [completionEvent.machine]: {
        status: completionEvent.state,
        lastUpdated: new Date(),
        stateDescription: event.type,
      },
    };
  }

  const initMonitorEntry = ({
    status = ProgressState.PENDING,
    lastUpdated = new Date()
  } = {} as Partial<ProgressMonitorEntry>): ProgressMonitorEntry  => ({
    status,
    lastUpdated,
    stateDescription: 'Service not initialized',
  })

  export const createState = <TContext extends Context>(opts: MachineOpts): MachineConfig<TContext, any, any> => ({
    id: 'progressMonitor',
    initial: 'init',
    on: {
      FAILED: {
        actions: assign<Context>({
          progressMonitor: (ctx, event) => {
            if (!(event as FailureErrorMessageEvent).machine) return ctx.progressMonitor;
            if(!((event as FailureErrorMessageEvent).machine in MachineName)) return ctx.progressMonitor;
            return {
              ...ctx.progressMonitor!,
              [(event as FailureErrorMessageEvent).machine]: {
                status: ProgressState.IN_ERROR,
                lastUpdated: new Date(),
                retries: (event as FailureErrorMessageEvent).retries,
                error: (event as FailureErrorMessageEvent).error,
                stateDescription: (event as FailureErrorMessageEvent).state,
              },
            };
          },
        }) as any,
        target: '.handlingProgressChange',
        internal: false,
      },
      '*': {
        actions: assign<Context>({ progressMonitor: handleProgressChanges }) as any,
        cond: 'shouldTrackProgress',
        target: '.handlingProgressChange',
        internal: false,
      },
    },
    states: {
      init: {
        always: {
          actions: assign({
            progressMonitor: (): Context['progressMonitor'] => ({
              PEER_JWS: initMonitorEntry(),
              DFSP_JWS: initMonitorEntry(),
              DFSP_CA: initMonitorEntry(),
              DFSP_SERVER_CERT: initMonitorEntry(),
              DFSP_CLIENT_CERT: initMonitorEntry(),
              HUB_CA: initMonitorEntry({ lastUpdated: null }), // todo: clarify why lastUpdated is null here ??
              HUB_CERT: initMonitorEntry(),
              ENDPOINT_CONFIG: initMonitorEntry(),
              UPLOAD_PEER_JWS: initMonitorEntry(),
            }),
          }) as any,
          target: 'idle',
        },
      },
      idle: {},
      handlingProgressChange: {
        always: [
          { target: 'notifyingCompleted', cond: 'completedStates' },
          { target: 'idle' }
        ],
      },
      notifyingCompleted: {
        invoke: {
          id: 'notifyCompleted',
          src: () =>
            invokeRetry({
              id: 'notifyCompleted',
              logger: opts.logger,
              retryInterval: opts.refreshIntervalSeconds * 1000,
              machine: 'progressMonitor',
              state: 'notifyCompleted',
              service: async () => {
                // TODO: notify onboard completed
              },
            }),
          onDone: 'idle',
        },
      },
    },
  });

  export const createGuards = <TContext extends Context>(opts: MachineOpts) => ({
    completedStates: (ctx) => Object.values(ctx.progressMonitor).every((entry) => entry),
    shouldTrackProgress: (_: Context, event: Event) => {
      const isCompletedEvent = event.type in eventToProgressMap;
      opts.logger.warn(`[progressMonitor]  shouldTrackProgress: ${isCompletedEvent}`, { event })
      return isCompletedEvent;
    },
  });
}
