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
    inboundEnrollmentId = 1,
} = {}) => Object.freeze({
    dfspId,
    hubEndpoint,
    retries,
    logger: new Logger.Logger(),
    inboundEnrollmentId,
});

const mockEndpointModelOptions = ({
    dfspId = 'dfspId',
    hubEndpoint = 'http://hubEndpoint.com',
    retries,
    epId = 1,
    type = 'type',
    direction = 'test',
    state = 'state',
} = {}) => Object.freeze({
    dfspId,
    hubEndpoint,
    retries,
    logger: new Logger.Logger(),
    epId,
    type,
    direction,
    state,
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

const mockUploadExternalDfspJWSData = () => Object.freeze([
    {
        dfspId: 'test1',
        createdAt: 1,
        publicKey: 'publicKey',
    },
]);

const mockUploadCSRData = () => Object.freeze({
    dfspId: 'test1',
    csr: 'csr',
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

const mockHubModelOptions = ({
    enId = 1,
    epId = 1,
    state = 'state',
    direction = 'test',
    type = 'type',
} = {}) => Object.freeze({
    enId,
    epId,
    state,
    direction,
    type,
});

module.exports = {
    mockAuth,
    mockJwtOptions,
    mockModelOptions,
    mockOidcData,
    mockOidcHttpResponse,
    mockUploadExternalDfspJWSData,
    mockUploadCSRData,
    mockEndpointModelOptions,
    mockHubModelOptions,
};
