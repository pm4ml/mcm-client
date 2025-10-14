/**************************************************************************
 *  (C) Copyright Mojaloop Foundation 2022                                *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha <yevhen.kyriukha@modusbox.com>                   *
 **************************************************************************/

import { ProgressMonitor } from '../../../../lib/stateMachine/states';
import { createMachine, interpret } from 'xstate';
import { createMachineOpts } from './commonMocks';
import { waitFor } from 'xstate/lib/waitFor';

import * as fixtures from '../../../fixtures';

type Context = ProgressMonitor.Context;
type Event = ProgressMonitor.Event;

const startMachine = (opts: ReturnType<typeof createMachineOpts>) => {
  const machine = createMachine<Context, Event>(
    {
      id: 'testMachine',
      context: {},
      type: 'parallel',
      states: {
        progressMonitor: ProgressMonitor.createState<Context>(opts),
      },
    },
    {
      guards: {
        ...ProgressMonitor.createGuards<Context>(),
      },
      actions: {},
    }
  );

  const service = interpret(machine); // .onTransition((state) => console.log(state.changed, state.value));
  service.start();

  return service;
};

describe('ProgressMonitor', () => {
  let opts: ReturnType<typeof createMachineOpts>;

  beforeAll(() => {
    opts = createMachineOpts();
  });

  test('should initialize context', async () => {
    const service = startMachine(opts);

    await waitFor(service, (state) => state.matches('progressMonitor.idle'));

    service.send('NEW_HUB_CA_FETCHED');
    service.send('DFSP_CA_PROPAGATED');
    service.send('DFSP_CLIENT_CERT_CONFIGURED');
    service.send('DFSP_SERVER_CERT_CONFIGURED');
    service.send('HUB_CLIENT_CERT_SIGNED');
    service.send('PEER_JWS_CONFIGURED');
    service.send('DFSP_JWS_PROPAGATED');
    service.send('ENDPOINT_CONFIG_PROPAGATED');

    await waitFor(service, (state) => state.matches('progressMonitor.notifyingCompleted'));

    service.stop();
  });

  describe('handleProgressChanges Tests -->', () => {
    test('should update progress monitor when completion event is received', () => {
      const mockContext: Context = fixtures.createProgressMonitorContext()
      const event: Event = { type: 'NEW_HUB_CA_FETCHED' };

      const result = ProgressMonitor.handleProgressChanges(mockContext, event);

      expect(result.HUB_CA.status).toBe(ProgressMonitor.ProgressState.COMPLETED);
      expect(result.HUB_CA.lastUpdated).toBeInstanceOf(Date);
      expect(result.HUB_CA.stateDescription).toBe('NEW_HUB_CA_FETCHED');
      expect(result.DFSP_CA.status).toBe(ProgressMonitor.ProgressState.PENDING);
    });

    test('should filter out intermediate/unmapped events and return unchanged progressMonitor', () => {
      const mockContext: Context = fixtures.createProgressMonitorContext()
      const intermediateEvent: Event = { type: 'FETCHING_HUB_CA' };

      const result = ProgressMonitor.handleProgressChanges(mockContext, intermediateEvent);

      expect(result).toBe(mockContext.progressMonitor);
      expect(result.HUB_CA.status).toBe(ProgressMonitor.ProgressState.PENDING);
    });

    test('should update machines independently while preserving other machine states', () => {
      const existingDate = new Date('2024-01-01T00:00:00Z');
      const HUB_CA = fixtures.createProgressMonitorEntry({
        status: ProgressMonitor.ProgressState.COMPLETED,
        lastUpdated: existingDate,
        stateDescription: 'NEW_HUB_CA_FETCHED',
      })
      const mockContext: Context = fixtures.createProgressMonitorContext({ HUB_CA })
      const event: Event = { type: 'DFSP_CA_PROPAGATED' };

      const result = ProgressMonitor.handleProgressChanges(mockContext, event);

      // DFSP_CA should be updated
      expect(result.DFSP_CA.status).toBe(ProgressMonitor.ProgressState.COMPLETED);
      expect(result.DFSP_CA.lastUpdated).toBeInstanceOf(Date);
      expect(result.DFSP_CA.stateDescription).toBe('DFSP_CA_PROPAGATED');
      // HUB_CA should remain unchanged
      expect(result.HUB_CA.status).toBe(ProgressMonitor.ProgressState.COMPLETED);
      expect(result.HUB_CA.lastUpdated).toBe(existingDate);
      expect(result.HUB_CA.stateDescription).toBe('NEW_HUB_CA_FETCHED');
      // Other machines should remain pending
      expect(result.DFSP_JWS.status).toBe(ProgressMonitor.ProgressState.PENDING);
    });
  })
});
