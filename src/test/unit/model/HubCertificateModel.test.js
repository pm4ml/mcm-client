const sdkSC = require('@mojaloop/sdk-standard-components');
const { HubCertificateModel, AuthModel} = require('../../../lib/model');
const { JWTSingleton } = require('../../../lib/requests/jwt');
const mocks = require('../mocks');

jest.mock('@mojaloop/sdk-standard-components', () => ({
    ...jest.requireActual('@mojaloop/sdk-standard-components'),
    request: jest.fn(async () => mocks.mockOidcHttpResponse()),
}));

describe('HubCertificateModel Tests -->', () => {
    let token;

    beforeAll(async () => {
        const options = mocks.mockJwtOptions();
        const jwt = new JWTSingleton(options);
        expect(jwt.getToken()).toBeUndefined();

        const authModel = new AuthModel(options);
        await authModel.login();

        token = jwt.getToken();
        expect(token).toBe(mocks.mockOidcData().access_token);
    });

    test('should call getHubCA endpoint ', async () => {
        const model = new HubCertificateModel(mocks.mockModelOptions());
        await model.getHubCA();

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain('/hub/ca');
    });

    test('should call getClientCerts endpoint ', async () => {
        const model = new HubCertificateModel(mocks.mockModelOptions());
        const state = 'tempState';
        await model.getClientCerts(state);

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain(`/enrollments/outbound?state=${state}`);
    });

    test('should call getServerCertificates endpoint ', async () => {
        const model = new HubCertificateModel(mocks.mockModelOptions());
        await model.getServerCertificates();

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain('/hub/servercerts');
    });

    test('should call uploadServerCertificate endpoint ', async () => {
        const model = new HubCertificateModel(mocks.mockModelOptions());
        const opts = mocks.mockHubCertificateModelOptions();
        await model.uploadServerCertificate(opts);

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain(`/enrollments/outbound/${opts.enId}/certificate`);
    });
});
