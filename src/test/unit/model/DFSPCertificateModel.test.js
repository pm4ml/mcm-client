const sdkSC = require('@mojaloop/sdk-standard-components');
const { DFSPCertificateModel, AuthModel } = require('../../../lib/model');
const { JWTSingleton } = require('../../../lib/requests/jwt');
const { CONTENT_TYPES } = require('../../../lib/constants');
const mocks = require('../mocks');

jest.mock('@mojaloop/sdk-standard-components', () => ({
    ...jest.requireActual('@mojaloop/sdk-standard-components'),
    request: jest.fn(async () => mocks.mockOidcHttpResponse()),
}));

describe('DFSPCertificateModel Tests -->', () => {
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

    test('should use access token as Cookie-header to do further calls to hub', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        await model.getDFSPCA();

        expect(sdkSC.request).toHaveBeenCalledTimes(2);
        const [requestArgs] = sdkSC.request.mock.calls[1];
        const { Cookie, 'Content-Type': contentType } = requestArgs.headers;
        expect(Cookie).toBe(token);
        expect(contentType).toBe(CONTENT_TYPES.json);
    });
});
