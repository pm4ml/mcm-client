/* eslint-disable import/prefer-default-export */
export class NoPeerJwsChangesError extends Error {
    constructor(msg = 'No peerJWS changes detected') {
        super(msg);
    }
}
