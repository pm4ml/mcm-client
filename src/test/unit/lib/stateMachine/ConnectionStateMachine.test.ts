/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 * Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------
 ******/

import { State } from 'xstate';
import { ConnectionStateMachine } from '@app/lib/stateMachine';
import { EXTERNAL_EVENT_TYPES } from '@app/lib/stateMachine/constants';
import { createMachineOpts } from '../../model/stateMachine/commonMocks';

describe('ConnectionStateMachine Tests -->', () => {
  describe('needToStoreState', () => {
    let connectionStateMachine: ConnectionStateMachine;
    let opts: ReturnType<typeof createMachineOpts>;

    beforeEach(() => {
      opts = createMachineOpts();
      connectionStateMachine = new ConnectionStateMachine(opts);
    });

    afterEach(() => {
      connectionStateMachine.stop();
    });

    test('should return true for external event PEER_JWS_CONFIGURED', () => {
      const state = {
        event: { type: EXTERNAL_EVENT_TYPES[0] },
      } as State<any, any>;

      const result = (connectionStateMachine as any).needToStoreState(state);
      expect(result).toBe(true);
    });

    test('should return true for external event UPLOADING_DFSP_CSR', () => {
      const state = {
        event: { type: 'UPLOADING_DFSP_CSR' },
      } as State<any, any>;

      const result = (connectionStateMachine as any).needToStoreState(state);
      expect(result).toBe(true);
    });

    test('should return false for non-external event', () => {
      const state = {
        event: { type: 'REGULAR_EVENT' },
      } as State<any, any>;

      const result = (connectionStateMachine as any).needToStoreState(state);
      expect(result).toBe(false);
    });
  });
});
