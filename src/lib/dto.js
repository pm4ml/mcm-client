const Ajv = require('ajv');
const { ERROR_MESSAGES } = require('./constants');

const ajv = new Ajv({ allErrors: true });

const makeErrMessage = (validateFn) => JSON.stringify(validateFn.errors.map((e) => e.message));

const oidcPayloadSchema = {
    type: 'object',
    properties: {
        client_id: { type: 'string' },
        client_secret: { type: 'string' },
        grant_type: { type: 'string' },
        scope: { type: 'string' },
    },
    required: ['client_id', 'client_secret', 'grant_type'],
    additionalProperties: false,
};
const validateOidcPayload = ajv.compile(oidcPayloadSchema);

const oidcRefreshPayloadSchema = {
    type: 'object',
    properties: {
        client_id: { type: 'string' },
        client_secret: { type: 'string' },
        grant_type: { type: 'string' },
        refresh_token: { type: 'string' },
    },
    required: ['client_id', 'grant_type', 'refresh_token'],
    additionalProperties: false,
};
const validateOidcRefreshPayload = ajv.compile(oidcRefreshPayloadSchema);

const oidcPayloadDto = (auth, grantType, scope) => {
    const dto = {
        client_id: auth.creds?.clientId,
        client_secret: auth.creds?.clientSecret,
        grant_type: grantType, // todo: add possible values check
        ...(scope ? { scope } : null),
    };

    const isValid = validateOidcPayload(dto);
    if (!isValid) {
        const errMessage = makeErrMessage(validateOidcPayload);
        throw new TypeError(`${ERROR_MESSAGES.oidcPayloadFormatError}: ${errMessage}`);
    }

    return Object.freeze(dto);
};

const oidcRefreshPayloadDto = (auth, refreshToken) => {
    const dto = {
        client_id: auth.creds?.clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        // Include client_secret if available (for confidential clients)
        ...(auth.creds?.clientSecret ? { client_secret: auth.creds.clientSecret } : null),
    };

    const isValid = validateOidcRefreshPayload(dto);
    if (!isValid) {
        const errMessage = makeErrMessage(validateOidcRefreshPayload);
        throw new TypeError(`${ERROR_MESSAGES.oidcPayloadFormatError}: ${errMessage}`);
    }

    return Object.freeze(dto);
};

module.exports = {
    oidcPayloadDto,
    oidcRefreshPayloadDto,
    validateOidcPayload,
};
