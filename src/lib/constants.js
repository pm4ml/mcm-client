const { env } = require('node:process');

const { OIDC_TOKEN_ROUTE = 'realms/dfsps/protocol/openid-connect/token' } = env;

const AUTH_HEADER = 'Authorization';
const OIDC_GRANT_TYPE = 'client_credentials';

const DEFAULT_RETRIES_COUNT = 2;

const ERROR_MESSAGES = Object.freeze({
    loginErrorInvalidStatusCode: 'Login Error: invalid status code',
    loginErrorNoToken: 'Login Error: no token in response',
    nonSuccessStatusCode: 'Request returned non-success status code',
    noProtocolInUrl: 'No protocol in URL',
    oidcPayloadFormatError: 'oidcPayload Format Error',
});

const CONTENT_TYPES = Object.freeze({
    json: 'application/json',
    formUrlEncoded: 'application/x-www-form-urlencoded',
});

module.exports = {
    AUTH_HEADER,
    CONTENT_TYPES,
    DEFAULT_RETRIES_COUNT,
    ERROR_MESSAGES,
    OIDC_GRANT_TYPE,
    OIDC_TOKEN_ROUTE,
};
