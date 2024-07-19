let mockResponse;
const mockRequest = jest.fn(async () => mockResponse);

const { JWTSingleton } = require('../../../lib/requests/jwt');
const { ERROR_MESSAGES } = require('../../../lib/constants');
const mocks = require('../mocks');

jest.mock('@mojaloop/sdk-standard-components', () => ({
    ...jest.requireActual('@mojaloop/sdk-standard-components'),
    request: mockRequest,
}));

describe('JWTSingleton Tests -->', () => {
    let jwt;

    beforeAll(() => {
        jwt = new JWTSingleton(mocks.mockJwtOptions());
        expect(jwt.getToken()).toBeUndefined();
    });

    test('should return the same instance', () => {
        const newJwt = new JWTSingleton();
        expect(newJwt).toEqual(jwt);
    });

    test('should get access token', async () => {
        mockResponse = mocks.mockOidcHttpResponse();
        expect(jwt.getToken()).toBeUndefined();
        await jwt.login();
        expect(jwt.getToken()).toBe(mocks.mockOidcData().access_token);
    });

    test('should throw error if no access token in response', async () => {
        mockRequest.mockClear();
        mockResponse = mocks.mockOidcHttpResponse({
            data: {},
        });
        await expect(() => jwt.login())
            .rejects.toThrowError(ERROR_MESSAGES.loginErrorNoToken);
        expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    test('should throw error if response has wrong statusCode', async () => {
        mockRequest.mockClear();
        mockResponse = mocks.mockOidcHttpResponse({
            statusCode: 204,
        });
        await expect(() => jwt.login())
            .rejects.toThrowError(ERROR_MESSAGES.loginErrorInvalidStatusCode);
        expect(mockRequest).toHaveBeenCalledTimes(2);
    });
});
