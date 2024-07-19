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

        let lastError;
        for (let retries = 0; retries < (this._auth.retry || 1); retries += 1) {
            try {
                // eslint-disable-next-line no-await-in-loop
                this.token = await this.post(route, postData, headers);
                return;
            } catch (err) {
                lastError = err;
                if (this._auth.delay) {
                    // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                    await new Promise((resolve) => setTimeout(resolve, this._auth.delay * 1000));
                }
            }
        }
        throw lastError;
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
                this._logger.push({ statusCode, data }).log(errMessage);
                throw new Error(errMessage);
            }
            if (!data?.access_token) {
                throw new Error(ERROR_MESSAGES.loginErrorNoToken);
            }

            return data.access_token;
        } catch (err) {
            this._logger.push({ err }).log('Error Login');
            throw err;
        }
    }
}

module.exports = {
    JWTSingleton,
};
