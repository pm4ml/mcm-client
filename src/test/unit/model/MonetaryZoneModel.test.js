const sdkSC = require('@mojaloop/sdk-standard-components');
const { MonetaryZoneModel, AuthModel } = require('../../../lib/model');
const { JWTSingleton } = require('../../../lib/requests/jwt');
const mocks = require('../mocks');

jest.mock('@mojaloop/sdk-standard-components', () => ({
    ...jest.requireActual('@mojaloop/sdk-standard-components'),
    request: jest.fn(async () => mocks.mockOidcHttpResponse()),
}));

describe('MonetaryZoneModel Tests -->', () => {
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

    test('should call getMonetaryZones endpoint ', async () => {
        const model = new MonetaryZoneModel(mocks.mockModelOptions());
        await model.getMonetaryZones();

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain('/monetaryzones');
    });

    test('should call getDfspsByMonetaryZone endpoint ', async () => {
        const model = new MonetaryZoneModel(mocks.mockModelOptions());
        await model.getDfspsByMonetaryZone();

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain('/monetaryzones');
    });
});
