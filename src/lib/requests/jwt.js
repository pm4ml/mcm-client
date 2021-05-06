/* eslint-disable */
// TODO: Remove previous line and work through linting issues at next edit

const querystring = require('querystring');
const { request } = require('@mojaloop/sdk-standard-components');
const http = require('http');
const { buildUrl, throwOrJson } = require('./common');

class JWTSingleton {
    constructor(opts) {
        if (JWTSingleton.instance) {
            return JWTSingleton.instance;
        }
        this._auth = opts.auth;
        if (opts.auth.enabled) {
            this._logger = opts.logger;
            // make sure we keep alive connections to the backend
            this.agent = new http.Agent({
                keepAlive: true,
            });
            this.transportScheme = 'http';
            // Switch or peer DFSP endpoint
            this._hubEndpoint = `${this.transportScheme}://${opts.hubEndpoint}`;
        }

        JWTSingleton.instance = this;

        return this;
    }

    async login() {
        if (!this._auth.enabled) {
            return;
        }
        const url = '/login';
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
        };

        if (process.env.HOST_HEADER_MCM_SERVER) {
            headers.host = process.env.HOST_HEADER_MCM_SERVER;
        }

        const postData = querystring.stringify({
            username: this._auth.creds.user,
            password: this._auth.creds.pass,
        });

        const result = await this.post(url, postData, headers);
        if (result.ok) {
            this.token = result.token;
        } else {
            throw new Error('Login fails');
        }
    }

    async getToken() {
        return this.token;
    }

    async post(url, body, headers) {
        const reqOpts = {
            method: 'POST',
            uri: buildUrl(this._hubEndpoint, url),
            headers,
            body,
        };

        this._logger.push({ reqOpts }).log('Executing Login');
        return request({ ...reqOpts, agent: this.agent })
            // throwOrJson is missing the headers, so I need to
            // first check if the token of login is comming
            .then(this._hasJWT)
            .then(throwOrJson)
            .catch((e) => {
                this._logger.push({ e }).log('Error Login');
                throw e;
            });
    }

    async _hasJWT(res) {
        const setCookieHeader = res.headers['set-cookie'];
        console.log('setCookieHeader::', setCookieHeader);
        if (setCookieHeader) {
            const accessToken = setCookieHeader
                .find((_cookie) => _cookie.includes('MCM-API_ACCESS_TOKEN'))// TODO: extract to process.env
                .split(';')
                .find((_cookie) => _cookie.includes('MCM-API_ACCESS_TOKEN'));
            // overrides data with the token
            res.data = {
                ok: res.data.ok,
                token: accessToken,
            };
            return Promise.resolve(res);
        }
        return Promise.reject(new Error('Invalid login'));
    }
}

module.exports = {
    JWTSingleton,
};
