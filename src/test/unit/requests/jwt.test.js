const { JWTSingleton } = require('../../../lib/requests/jwt');
const { ERROR_MESSAGES } = require('../../../lib/constants');
const mocks = require('../mocks');

let mockResponse;

jest.mock('@mojaloop/sdk-standard-components', () => ({
    ...jest.requireActual('@mojaloop/sdk-standard-components'),
    request: jest.fn(async () => mockResponse),
}));

describe('JWTSingleton Tests -->', () => {
    let jwt;

    beforeAll(async () => {
        jwt = new JWTSingleton(mocks.mockJwtOptions());
        expect(await jwt.getToken()).toBeUndefined();
    });

    afterAll(() => {
        jwt.destroy();
    });

    test('should return the same instance', () => {
        const newJwt = new JWTSingleton();
        expect(newJwt).toEqual(jwt);
    });

    test('should get access token', async () => {
        mockResponse = mocks.mockOidcHttpResponse();
        expect(await jwt.getToken()).toBeUndefined();
        await jwt.login();
        expect(await jwt.getToken()).toBe(mocks.mockOidcData().access_token);
    });

    test('should throw error if no access token in response', async () => {
        mockResponse = mocks.mockOidcHttpResponse({
            data: {},
        });
        await expect(() => jwt.login())
            .rejects.toThrowError(ERROR_MESSAGES.loginErrorNoToken);
    });

    test('should throw error if response has wrong statusCode', async () => {
        mockResponse = mocks.mockOidcHttpResponse({
            statusCode: 204,
        });
        await expect(() => jwt.login())
            .rejects.toThrowError(ERROR_MESSAGES.loginErrorInvalidStatusCode);
    });
});
