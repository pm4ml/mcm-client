const OIDC_TOKEN_ROUTE = 'realms/dfsps/protocol/openid-connect/token';

const OIDC_GRANT_TYPE = 'client_credentials';

const ERROR_MESSAGES = Object.freeze({
    loginErrorInvalidStatusCode: 'Login Error: invalid status code',
    loginErrorNoToken: 'Login Error: no token in response',
    oidcPayloadFormatError: 'oidcPayload Format Error',
});

const CONTENT_TYPES = Object.freeze({
    json: 'application/json',
    formUrlEncoded: 'application/x-www-form-urlencoded',
});

module.exports = {
    CONTENT_TYPES,
    ERROR_MESSAGES,
    OIDC_GRANT_TYPE,
    OIDC_TOKEN_ROUTE,
};
