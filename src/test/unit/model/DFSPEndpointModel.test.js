const { DFSPEndpointModel } = require('../../../lib/model');
const { JWTSingleton } = require('../../../lib/requests/jwt');
const mocks = require('../mocks');

jest.mock('@mojaloop/sdk-standard-components', () => ({
    ...jest.requireActual('@mojaloop/sdk-standard-components'),
    request: jest.fn(async () => mocks.mockOidcHttpResponse()),
}));

describe('DFSPEndpointModel Tests -->', () => {
    beforeAll(async () => {
        // eslint-disable-next-line no-unused-vars
        const jwt = new JWTSingleton(mocks.mockJwtOptions());
    });

    test('should do findById call without error [bug IPROD-209]', async () => {
        const model = new DFSPEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockEndpointModelOptions();
        const data = await model.findById(opts);
        expect(data).toBeTruthy();
    });

    test('should do get findAll call without error', async () => {
        const model = new DFSPEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockEndpointModelOptions();
        const data = await model.findAll(opts);
        expect(data).toBeTruthy();
    });

    test('should do get findAll with opts.type call without error', async () => {
        const model = new DFSPEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockEndpointModelOptions();
        const data = await model.findAll(opts);
        expect(data).toBeTruthy();
    });

    test('should do get findAll with opts.direction call without error', async () => {
        const model = new DFSPEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockEndpointModelOptions();
        const data = await model.findAll(opts);
        expect(data).toBeTruthy();
    });

    test('should do get findAll with opts.state call without error', async () => {
        const model = new DFSPEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockEndpointModelOptions();
        const data = await model.findAll(opts);
        expect(data).toBeTruthy();
    });

    test('should do get create call without error', async () => {
        const model = new DFSPEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockEndpointModelOptions();
        const data = await model.create(opts);
        expect(data).toBeTruthy();
    });

    test('should do create call with direction EGRESS without error', async () => {
        const model = new DFSPEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockEndpointModelOptions({ direction: 'EGRESS' });
        const data = await model.create(opts);
        expect(data).toBeTruthy();
    });

    test('should do create call with direction INGRESS without error', async () => {
        const model = new DFSPEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockEndpointModelOptions({ direction: 'INGRESS' });
        const data = await model.create(opts);
        expect(data).toBeTruthy();
    });

    test('should do get delete call without error', async () => {
        const model = new DFSPEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockEndpointModelOptions();
        const data = await model.delete(opts);
        expect(data).toBeTruthy();
    });

    test('should do get update call without error', async () => {
        const model = new DFSPEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockEndpointModelOptions();
        const data = await model.update(opts);
        expect(data).toBeTruthy();
    });

    test('should do update call with type IP without error', async () => {
        const model = new DFSPEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockEndpointModelOptions({ type: 'IP' });
        const data = await model.update(opts);
        expect(data).toBeTruthy();
    });

    test('should do update call with type URL without error', async () => {
        const model = new DFSPEndpointModel(mocks.mockModelOptions());
        const opts = mocks.mockEndpointModelOptions({ type: 'URL' });
        const data = await model.update(opts);
        expect(data).toBeTruthy();
    });
});
