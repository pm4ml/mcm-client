const dto = require('../../lib/dto');
const { ERROR_MESSAGES } = require('../../lib/constants');

describe('DTO Tests -->', () => {
    describe('oidcPayloadDto Tests -->', () => {
        test('should pass validation', () => {
            const auth = {
                creds: { clientId: 'clientId', clientSecret: 'clientSecret' },
            };
            const data = dto.oidcPayloadDto(auth, 'grantType');
            expect(data).toBeTruthy();
        });

        test('should throw on wrong format', () => {
            expect(() => dto.oidcPayloadDto({}))
                .toThrowError(ERROR_MESSAGES.oidcPayloadFormatError);
        });
    });
});
