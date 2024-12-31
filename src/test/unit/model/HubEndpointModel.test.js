const sdkSC = require('@mojaloop/sdk-standard-components');
const { HubEndpointModel, AuthModel, DFSPEndpointModel} = require('../../../lib/model');
const { JWTSingleton } = require('../../../lib/requests/jwt');
const mocks = require('../mocks');

jest.mock('@mojaloop/sdk-standard-components', () => ({
    ...jest.requireActual('@mojaloop/sdk-standard-components'),
    request: jest.fn(async () => mocks.mockOidcHttpResponse()),
}));

describe('HubEndpointModel Tests -->', () => {
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

    test('should call findById endpoint ', async () => {
        const model = new HubEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockHubModelOptions();
        await model.findById(opts);

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain(`/hub/endpoints/${opts.epId}`);
    });

    test('should call findAll endpoint ', async () => {
        const model = new HubEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockHubModelOptions({ state: 'state' });
        const data = await model.findAll(opts);

        expect(data).toBeTruthy();
    });

    test('should do findAll call with type filter without error', async () => {
        const model = new DFSPEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockHubModelOptions({ type: 'type' });
        const data = await model.findAll(opts);
        expect(data).toBeTruthy();
    });

    test('should do findAll call with direction filter without error', async () => {
        const model = new DFSPEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockHubModelOptions({ direction: 'EGRESS' });
        const data = await model.findAll(opts);
        expect(data).toBeTruthy();
    });
});
