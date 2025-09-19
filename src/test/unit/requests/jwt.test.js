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

    describe('Token Refresh Tests', () => {
        let refreshJwt;

        beforeEach(() => {
            // Clear singleton instance for fresh test
            JWTSingleton.instance = null;
            jest.useFakeTimers();
        });

        afterEach(() => {
            if (refreshJwt) {
                refreshJwt.destroy();
            }
            jest.useRealTimers();
        });

        test('should refresh token when expired using getToken with tokenRefreshEnabled', async () => {
            const mockOptions = mocks.mockJwtOptions({
                auth: {
                    ...mocks.mockAuth(),
                    tokenRefreshEnabled: true,
                },
            });
            refreshJwt = new JWTSingleton(mockOptions);

            // Mock initial login response
            mockResponse = mocks.mockOidcHttpResponse({
                data: {
                    ...mocks.mockOidcData(),
                    refresh_token: 'refresh.token.value',
                },
            });
            await refreshJwt.login();

            // Simulate token expiry by setting expiry time in the past
            refreshJwt._tokenExpiresAt = Date.now() - 1000;

            // Mock refresh token response
            mockResponse = mocks.mockOidcHttpResponse({
                data: {
                    ...mocks.mockOidcData(),
                    access_token: 'new.access.token',
                    refresh_token: 'new.refresh.token',
                },
            });

            const token = await refreshJwt.getToken();
            expect(token).toBe('new.access.token');
        });

        test('should refresh token manually using refreshAccessToken', async () => {
            refreshJwt = new JWTSingleton(mocks.mockJwtOptions());

            // Mock initial login response with refresh token
            mockResponse = mocks.mockOidcHttpResponse({
                data: {
                    ...mocks.mockOidcData(),
                    refresh_token: 'refresh.token.value',
                },
            });
            await refreshJwt.login();

            // Mock refresh token response
            mockResponse = mocks.mockOidcHttpResponse({
                data: {
                    ...mocks.mockOidcData(),
                    access_token: 'refreshed.access.token',
                    refresh_token: 'new.refresh.token',
                },
            });

            const newToken = await refreshJwt.refreshAccessToken();
            expect(newToken).toBe('refreshed.access.token');
            expect(refreshJwt.token).toBe('refreshed.access.token');
        });

        test('should return null when refresh token is not available', async () => {
            refreshJwt = new JWTSingleton(mocks.mockJwtOptions());

            // Initial login without refresh token
            mockResponse = mocks.mockOidcHttpResponse({
                data: {
                    ...mocks.mockOidcData(),
                    // No refresh_token in response
                },
            });
            await refreshJwt.login();

            // Since there's no refresh token, refreshAccessToken should return null
            const result = await refreshJwt.refreshAccessToken();
            expect(result).toBeNull();
        });

        test('should fall back to login when refresh token request fails', async () => {
            refreshJwt = new JWTSingleton(mocks.mockJwtOptions());

            // Mock initial login response with refresh token
            mockResponse = mocks.mockOidcHttpResponse({
                data: {
                    ...mocks.mockOidcData(),
                    refresh_token: 'invalid.refresh.token',
                },
            });
            await refreshJwt.login();

            // Mock failed refresh response
            mockResponse = mocks.mockOidcHttpResponse({
                statusCode: 400,
                data: { error: 'invalid_grant' },
            });

            // Mock successful login fallback
            const loginSpy = jest.spyOn(refreshJwt, 'login').mockResolvedValue('fallback.token');

            const result = await refreshJwt.refreshAccessToken();
            expect(loginSpy).toHaveBeenCalled();
            expect(result).toBe('fallback.token');

            loginSpy.mockRestore();
        });

        test('should return null when auth is disabled for refresh', async () => {
            const disabledAuthOptions = mocks.mockJwtOptions({
                auth: { ...mocks.mockAuth(), enabled: false },
            });
            refreshJwt = new JWTSingleton(disabledAuthOptions);

            const result = await refreshJwt.refreshAccessToken();
            expect(result).toBeNull();
        });

        test('should check if token is expired correctly', async () => {
            refreshJwt = new JWTSingleton(mocks.mockJwtOptions());

            // Test with no expiry time set
            expect(refreshJwt.isTokenExpired()).toBe(true);

            // Set token expiry in the future
            refreshJwt._tokenExpiresAt = Date.now() + 60000; // 1 minute from now
            expect(refreshJwt.isTokenExpired()).toBe(false);

            // Set token expiry in the past
            refreshJwt._tokenExpiresAt = Date.now() - 1000; // 1 second ago
            expect(refreshJwt.isTokenExpired()).toBe(true);

            // Test with buffer seconds
            refreshJwt._tokenExpiresAt = Date.now() + 3000; // 3 seconds from now
            expect(refreshJwt.isTokenExpired(5)).toBe(true); // Should be expired with 5s buffer
            expect(refreshJwt.isTokenExpired(1)).toBe(false); // Should not expire with 1s buffer
        });

        test('should schedule token refresh correctly', async () => {
            refreshJwt = new JWTSingleton(mocks.mockJwtOptions());

            // Mock login response
            mockResponse = mocks.mockOidcHttpResponse({
                data: {
                    ...mocks.mockOidcData(),
                    expires_in: 300, // 5 minutes
                    refresh_token: 'refresh.token',
                },
            });
            await refreshJwt.login();

            expect(refreshJwt._tokenRefreshInterval).toBeTruthy();
            expect(refreshJwt._tokenLifeTime).toBe(300);
        });

        test('should clear intervals on destroy', async () => {
            refreshJwt = new JWTSingleton(mocks.mockJwtOptions());

            // Mock login response
            mockResponse = mocks.mockOidcHttpResponse({
                data: {
                    ...mocks.mockOidcData(),
                    refresh_token: 'refresh.token',
                },
            });
            await refreshJwt.login();

            expect(refreshJwt._tokenRefreshInterval).toBeTruthy();
            expect(refreshJwt.token).toBeTruthy();
            expect(refreshJwt._refreshToken).toBeTruthy();

            refreshJwt.destroy();

            expect(refreshJwt._tokenRefreshInterval).toBeNull();
            expect(refreshJwt.token).toBeNull();
            expect(refreshJwt._refreshToken).toBeNull();
            expect(refreshJwt._tokenExpiresAt).toBeNull();
            expect(refreshJwt._tokenLifeTime).toBeNull();
        });

        test('should not schedule refresh when no token lifetime available', async () => {
            refreshJwt = new JWTSingleton(mocks.mockJwtOptions());

            // Mock login response without expires_in
            mockResponse = mocks.mockOidcHttpResponse({
                data: {
                    access_token: 'token.without.expiry',
                    // No expires_in field
                },
            });
            await refreshJwt.login();

            expect(refreshJwt._tokenRefreshInterval).toBeNull();
        });

        test('should clear existing interval before scheduling new one', async () => {
            refreshJwt = new JWTSingleton(mocks.mockJwtOptions());

            // First login
            mockResponse = mocks.mockOidcHttpResponse({
                data: {
                    ...mocks.mockOidcData(),
                    refresh_token: 'first.refresh.token',
                },
            });
            await refreshJwt.login();

            const firstInterval = refreshJwt._tokenRefreshInterval;
            expect(firstInterval).toBeTruthy();

            // Second login should clear the first interval
            mockResponse = mocks.mockOidcHttpResponse({
                data: {
                    ...mocks.mockOidcData(),
                    access_token: 'second.token',
                    refresh_token: 'second.refresh.token',
                },
            });
            await refreshJwt.login();

            const secondInterval = refreshJwt._tokenRefreshInterval;
            expect(secondInterval).toBeTruthy();
            expect(secondInterval).not.toBe(firstInterval);
        });

        test('should handle invalid expires_in values gracefully', async () => {
            refreshJwt = new JWTSingleton(mocks.mockJwtOptions());

            // Test with string expires_in
            mockResponse = mocks.mockOidcHttpResponse({
                data: {
                    access_token: 'token.with.string.expiry',
                    expires_in: '300', // String instead of number
                    refresh_token: 'refresh.token',
                },
            });
            await refreshJwt.login();

            expect(refreshJwt._tokenExpiresAt).toBeNull();
            expect(refreshJwt._tokenLifeTime).toBe('300'); // Stored as-is
            // Should be expired when _tokenExpiresAt is null
            expect(refreshJwt.isTokenExpired()).toBe(true);

            // Test with negative expires_in
            mockResponse = mocks.mockOidcHttpResponse({
                data: {
                    access_token: 'token.with.negative.expiry',
                    expires_in: -100,
                    refresh_token: 'refresh.token',
                },
            });
            await refreshJwt.login();

            expect(refreshJwt._tokenExpiresAt).toBeNull();
            expect(refreshJwt._tokenLifeTime).toBe(-100);
            expect(refreshJwt.isTokenExpired()).toBe(true);

            // Test with null expires_in
            mockResponse = mocks.mockOidcHttpResponse({
                data: {
                    access_token: 'token.with.null.expiry',
                    expires_in: null,
                    refresh_token: 'refresh.token',
                },
            });
            await refreshJwt.login();

            expect(refreshJwt._tokenExpiresAt).toBeNull();
            expect(refreshJwt._tokenLifeTime).toBeNull();
            expect(refreshJwt.isTokenExpired()).toBe(true);
        });
    });
});
