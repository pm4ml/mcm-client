const OIDC_TOKEN_ROUTE = 'realms/dfsps/protocol/openid-connect/token';

const OIDC_GRANT_TYPE = 'client_credentials';

const ERROR_MESSAGES = Object.freeze({
    loginErrorInvalidStatusCode: 'Login Error: invalid status code',
    loginErrorNoToken: 'Login Error: no token in response',
    oidcPayloadFormatError: 'oidcPayload Format Error',
});

module.exports = {
    ERROR_MESSAGES,
    OIDC_TOKEN_ROUTE,
    OIDC_GRANT_TYPE,
};
