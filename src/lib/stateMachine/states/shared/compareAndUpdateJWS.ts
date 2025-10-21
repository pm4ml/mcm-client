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

import _ from 'lodash';
import { Logger } from '@mojaloop/sdk-standard-components';
import { PeerJwsItem } from './types';

interface CompareJWSResult {
  changes: PeerJwsItem[];
  updatedPeerJWS: PeerJwsItem[];
}

/**
 * Compares new JWS certificates with existing ones and returns changes.
 * Throws an error if no changes are detected.
 *
 * @param newJWS - New JWS certificates to compare
 * @param currentJWS - Current JWS certificates in context
 * @param logger - Context Logger instance
 * @returns Object with changes and updated JWS array
 * @throws Error when no changes are detected
 */
export function compareAndUpdateJWS(
  newJWS: PeerJwsItem[],
  currentJWS: PeerJwsItem[] | undefined,
  logger: Logger.SdkLogger
): CompareJWSResult {
  const log = logger.child({ step: 'compareAndUpdateJWS' })
  const changes = _.differenceWith(
    newJWS,
    currentJWS!,
    (a, b) => a.dfspId === b.dfspId && a.createdAt <= b.createdAt
  );

  if (changes.length === 0) {
    const logMsg = 'No changes detected';
    log.debug(logMsg);
    throw new Error(logMsg);
  }

  // Iterate through changes array and replace those values in the context with the new values
  // Clone the context.peerJWS array
  const updatedPeerJWS = currentJWS ? _.cloneDeep(currentJWS) : [];

  changes.forEach((change) => {
    const index = updatedPeerJWS!.findIndex((jws) => jws.dfspId === change.dfspId);
    if (index === -1) {
      updatedPeerJWS!.push(change);
    } else {
      updatedPeerJWS![index] = change;
    }
  });
  log.info('peerJWS changes detected');

  return { changes, updatedPeerJWS };
}
