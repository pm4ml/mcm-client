const { Logger } = require('@mojaloop/sdk-standard-components');

const mockAuth = ({
    enabled = true,
    clientId = 'clientId',
    clientSecret = 'clientSecret',
} = {}) => Object.freeze({
    enabled,
    creds: {
        clientId,
        clientSecret,
    },
});

const mockJwtOptions = ({
    auth = mockAuth(),
    hubIamProviderUrl = 'https://hubIamProviderUrl.com',
} = {}) => Object.freeze({
    auth,
    hubIamProviderUrl,
    logger: new Logger.Logger({}),
});

const mockModelOptions = ({
    dfspId = 'dfspId',
    hubEndpoint = 'http://hubEndpoint.com',
    retries,
} = {}) => Object.freeze({
    dfspId,
    hubEndpoint,
    retries,
    logger: new Logger.Logger(),
});

const mockOidcData = ({
    access_token = 'fake.access.token',
} = {}) => Object.freeze({
    access_token,
    expires_in: 300,
    refresh_expires_in: 0,
    token_type: 'Bearer',
    'not-before-policy': 0,
    scope: 'profile email',
});

const mockOidcHttpResponse = ({
    statusCode = 200,
    data = mockOidcData(),
    headers = {},
} = {}) => Object.freeze({
    statusCode,
    data,
    headers,
});

module.exports = {
    mockAuth,
    mockJwtOptions,
    mockModelOptions,
    mockOidcData,
    mockOidcHttpResponse,
};
