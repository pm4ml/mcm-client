/**************************************************************************
 *  (C) Copyright Mojaloop Foundation 2022                                *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha <yevhen.kyriukha@modusbox.com>                   *
 **************************************************************************/

import Vault from '../../../../lib/vault';
import config from './config';
import * as MCMClient from '../../../../lib/model';
import * as ControlServer from '../../../../lib/ControlServer';
import SDKStandardComponents from '@mojaloop/sdk-standard-components';

jest.mock('../../../../lib/vault');
jest.mock('../../../../lib/model');
jest.mock('../../../../lib/ControlServer');
jest.mock('@mojaloop/sdk-standard-components');

export const createMachineOpts = () => {
  const vaultObj = new Vault({
    ...config.vault,
    commonName: config.mojaloopConnectorFQDN,
    logger: new SDKStandardComponents.Logger.SdkLogger(),
  });
  const vault = jest.mocked(vaultObj);

  const modelOpts = {
    dfspId: config.dfspId,
    hubEndpoint: config.mcmServerEndpoint,
    logger: new SDKStandardComponents.Logger.SdkLogger(),
  };

  const ctx = {
    dfspCertificateModel: jest.mocked(new MCMClient.DFSPCertificateModel(modelOpts)),
    hubCertificateModel: jest.mocked(new MCMClient.HubCertificateModel(modelOpts)),
    hubEndpointModel: jest.mocked(new MCMClient.HubEndpointModel(modelOpts)),
    dfspEndpointModel: jest.mocked(new MCMClient.DFSPEndpointModel(modelOpts)),
  };

  const cfg = JSON.parse(JSON.stringify(config)) as typeof config;

  return {
    ...cfg,
    config: cfg,
    port: config.stateMachineDebugPort,
    ...ctx,
    logger: new SDKStandardComponents.Logger.SdkLogger(),
    vault,
    ControlServer: jest.mocked(ControlServer),
    certManager: undefined,
  };
};

export const createTestConfigState = (onConfigChange: typeof jest.fn) => ({
  initial: 'idle',
  on: {
    UPDATE_CONNECTOR_CONFIG: { target: '.updatingConfig', internal: false },
  },
  states: {
    idle: {},
    updatingConfig: {
      invoke: {
        src: async (ctx, event: any) => {
          return onConfigChange(event.config);
        },
        onDone: 'idle',
      },
    },
  },
});
