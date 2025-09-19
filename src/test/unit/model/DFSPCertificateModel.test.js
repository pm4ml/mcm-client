const { DFSPCertificateModel, AuthModel } = require('../../../lib/model');
const { JWTSingleton } = require('../../../lib/requests/jwt');
const { AUTH_HEADER, CONTENT_TYPES, ERROR_MESSAGES } = require('../../../lib/constants');
const mocks = require('../mocks');

jest.mock('@mojaloop/sdk-standard-components', () => ({
    ...jest.requireActual('@mojaloop/sdk-standard-components'),
    request: jest.fn(async () => mocks.mockErrorHttpResponse()),
}));

// eslint-disable-next-line import/order
const sdkSC = require('@mojaloop/sdk-standard-components');

describe('DFSPCertificateModel Tests -->', () => {
    let token;

    beforeAll(async () => {
        sdkSC.request.mockImplementation(async () => mocks.mockOidcHttpResponse());

        const options = mocks.mockJwtOptions();
        const jwt = new JWTSingleton(options);
        expect(await jwt.getToken()).toBeUndefined();

        const authModel = new AuthModel(options);
        await authModel.login();

        token = await jwt.getToken();
        expect(token).toBe(mocks.mockOidcData().access_token);
    });

    test('should use access token as Authorization-header to do further calls to hub', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        await model.getDFSPCA();

        expect(sdkSC.request).toHaveBeenCalledTimes(2);
        const [requestArgs] = sdkSC.request.mock.calls[1];
        const {
            [AUTH_HEADER]: authHeader,
            'Content-Type': contentType,
        } = requestArgs.headers;
        expect(authHeader).toBe(`Bearer ${token}`);
        expect(contentType).toBe(CONTENT_TYPES.json);
    });

    test('should call external-dfsps endpiont on uploadExternalDfspJWS', async () => {
        sdkSC.request.mockImplementation(async () => mocks.mockUploadExternalDfspJWSHttpResponse());

        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        await model.uploadExternalDfspJWS(mocks.mockUploadExternalDfspJWSData());

        expect(sdkSC.request).toHaveBeenCalledTimes(3);
        const [requestArgs] = sdkSC.request.mock.calls[2];
        expect(requestArgs.uri).toContain('/external-dfsps/jwscerts');
    });

    test('should throw error if hubEndpoint does not have protocol part', async () => {
        const options = mocks.mockModelOptions({
            hubEndpoint: 'hubEndpoint.com',
        });
        expect(() => new DFSPCertificateModel(options))
            .toThrowError(ERROR_MESSAGES.noProtocolInUrl);
    });
});
