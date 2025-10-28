/**************************************************************************
 *  (C) Copyright Mojaloop Foundation 2022                                *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha <yevhen.kyriukha@modusbox.com>                   *
 **************************************************************************/

import { DfspServerCert } from '../../../../lib/stateMachine/states';
import { createMachine, interpret } from 'xstate';
import { createMachineOpts, createTestConfigState } from './commonMocks';
import { waitFor } from 'xstate/lib/waitFor';

jest.setTimeout(10000);

type Context = DfspServerCert.Context;
type Event = DfspServerCert.Event;

const startMachine = (opts: ReturnType<typeof createMachineOpts>, onConfigChange: typeof jest.fn) => {
  const machine = createMachine<Context, Event>(
    {
      id: 'testMachine',
      context: {},
      type: 'parallel',
      states: {
        creatingDfspServerCert: DfspServerCert.createState<Context>(opts),
        connectorConfig: createTestConfigState(onConfigChange),
      },
    },
    {
      guards: {
        ...DfspServerCert.createGuards<Context>(opts),
      },
      actions: {},
    }
  );

  const service = interpret(machine); // .onTransition((state) => console.log(state.changed, state.value));
  service.start();

  return service;
};

describe('DfspServerCert', () => {
  let opts: ReturnType<typeof createMachineOpts>;

  beforeEach(() => {
    opts = createMachineOpts();
    // Mock getDFSPServerCertificates to return existing cert by default
    opts.dfspCertificateModel.getDFSPServerCertificates.mockImplementation(async () => ({
      serverCertificate: 'EXISTING CERT',
      serverCertInfo: {
        notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      },
    }));
  });

  test('should create DFSP Server Cert and upload it', async () => {
    opts.vault.createDFSPServerCert.mockImplementation(async () => ({
      intermediateChain: 'CA CHAIN',
      rootCertificate: 'ROOT CA',
      serverCertificate: 'SERVER CERT',
      privateKey: 'PKEY',
    }));

    const configUpdate = jest.fn();
    const service = startMachine(opts, configUpdate);

    const csr = { subject: { CN: 'test-server' } };

    service.send({ type: 'CREATE_DFSP_SERVER_CERT', csr });

    await waitFor(service, (state) => state.matches('creatingDfspServerCert.scheduledExpiryCheck'));

    expect(opts.vault.createDFSPServerCert).toHaveBeenCalledWith(csr);

    expect(configUpdate).toHaveBeenCalledWith({
      inbound: {
        tls: {
          creds: {
            ca: 'ROOT CA',
            cert: 'SERVER CERT',
            key: 'PKEY',
          },
        },
      },
    });

    service.stop();
  });

  test('should renew server cert when expiring', async () => {
    // Mock getDFSPServerCertificates to return expiring cert
    opts.dfspCertificateModel.getDFSPServerCertificates.mockImplementation(async () => ({
      serverCertificate: 'EXPIRING CERT',
      serverCertificateInfo: {
        notAfter: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now (within threshold)
      },
    }));

    opts.vault.createDFSPServerCert.mockImplementation(async () => ({
      intermediateChain: 'NEW CA CHAIN',
      rootCertificate: 'NEW ROOT CA',
      serverCertificate: 'NEW SERVER CERT',
      privateKey: 'NEW PKEY',
    }));

    const configUpdate = jest.fn();
    const service = startMachine(opts, configUpdate);

    // Wait for the machine to check the cert and trigger renewal
    await waitFor(service, (state) => state.matches('creatingDfspServerCert.scheduledExpiryCheck'));

    expect(opts.dfspCertificateModel.getDFSPServerCertificates).toHaveBeenCalled();
    expect(opts.vault.createDFSPServerCert).toHaveBeenCalled();

    service.stop();
  });
});
