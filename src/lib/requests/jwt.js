/* eslint-disable no-constructor-return, import/no-extraneous-dependencies */
const querystring = require('querystring');
const { request } = require('@mojaloop/sdk-standard-components');

const { ERROR_MESSAGES, OIDC_TOKEN_ROUTE, OIDC_GRANT_TYPE } = require('../constants');
const { oidcPayloadDto } = require('../dto');
const { buildUrl, defineAgent, makeFormUrlEncodedHeaders } = require('./common');

class JWTSingleton {
    constructor(opts) {
        if (JWTSingleton.instance) {
            return JWTSingleton.instance;
        }

        this._auth = opts.auth;
        if (opts.auth.enabled) {
            this._logger = opts.logger;
            this._hubIamProviderUrl = opts.hubIamProviderUrl;
            this._oidcTokenRoute = opts.oidcTokenRoute || OIDC_TOKEN_ROUTE;
            this._oidcGrantType = opts.oidcGrantType || OIDC_GRANT_TYPE;
            this._oidcScope = opts.oidcScope; // e.g. 'email profile'

            this.agent = defineAgent(this._hubIamProviderUrl);
        }

        JWTSingleton.instance = this;

        return this;
    }

    async login() {
        if (!this._auth.enabled) {
            return;
        }
        const route = this._oidcTokenRoute;
        const headers = makeFormUrlEncodedHeaders();

        const payload = oidcPayloadDto(this._auth, this._oidcGrantType, this._oidcScope);
        const postData = querystring.stringify(payload);

        this.token = await this.post(route, postData, headers);
    }

    getToken() {
        return this.token;
    }

    async post(route, body, headers) {
        try {
            const reqOpts = {
                method: 'POST',
                uri: buildUrl(this._hubIamProviderUrl, route),
                headers,
                body,
            };
            this._logger.push({ reqOpts }).log('Executing Login');

            const { statusCode, data } = await request({ ...reqOpts, agent: this.agent });

            if (statusCode !== 200) {
                const errMessage = ERROR_MESSAGES.loginErrorInvalidStatusCode;
                this._logger.push({ statusCode, data }).warn(errMessage);
                throw new Error(errMessage);
            }
            if (!data?.access_token) {
                throw new Error(ERROR_MESSAGES.loginErrorNoToken);
            }

            return data.access_token;
        } catch (error) {
            this._logger.push({ error }).error('Error Login');
            throw error;
        }
    }
}

module.exports = {
    JWTSingleton,
};
