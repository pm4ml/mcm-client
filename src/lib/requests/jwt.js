/* eslint-disable */
// TODO: Remove previous line and work through linting issues at next edit

const https = require('https');
const querystring = require('querystring');
const { request } = require('@mojaloop/sdk-standard-components');
const { ERROR_MESSAGES, OIDC_TOKEN_ROUTE, OIDC_GRANT_TYPE  } = require('../constants');
const { oidcPayloadDto } = require('../dto');
const { buildUrl } = require('./common');

class JWTSingleton {
    constructor(opts) {
        if (JWTSingleton.instance) {
            return JWTSingleton.instance;
        }
        this._auth = opts.auth;
        if (opts.auth.enabled) {
            this._logger = opts.logger;
            // make sure we keep alive connections to the backend
            this.agent = new https.Agent({
                keepAlive: true,
            });
            this.transportScheme = 'https'; // todo: clarify, why protocol is separated from endpoint?

            this._hubIamProviderUrl = `${this.transportScheme}://${opts.hubIamProviderUrl}`;
            this._oidcTokenRoute = opts.oidcTokenRoute || OIDC_TOKEN_ROUTE;
            this._oidcGrantType = opts.oidcGrantType || OIDC_GRANT_TYPE;
            this._oidcScope = opts.oidcScope; // e.g. 'email profile'
        }

        JWTSingleton.instance = this;

        return this;
    }

    async login() {
        if (!this._auth.enabled) {
            return;
        }
        const route = this._oidcTokenRoute;
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
        };

        // todo: clarify, why do we need this header
        if (process.env.HOST_HEADER_MCM_SERVER) {
            headers.host = process.env.HOST_HEADER_MCM_SERVER;
        }

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
            const { statusCode,  data } = await request({ ...reqOpts, agent: this.agent });

            if (statusCode !== 200) {
                throw new Error(ERROR_MESSAGES.loginErrorInvalidStatusCode)
            }
            if (!data?.access_token) {
                throw new Error(ERROR_MESSAGES.loginErrorNoToken)
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
