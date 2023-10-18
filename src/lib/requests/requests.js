/* eslint-disable */
// TODO: Remove previous line and work through linting issues at next edit

/** ************************************************************************
 *  (C) Copyright ModusBox Inc. 2019 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Murthy Kakarlamudi - murthy@modusbox.com                             *
 ************************************************************************* */

const retry = require('async-retry');
const { request } = require('@mojaloop/sdk-standard-components');
const { AUTH_HEADER, DEFAULT_RETRIES_COUNT } = require('../constants');
const { JWTSingleton } = require('./jwt');
const {
    buildUrl, throwOrJson, makeJsonHeaders, HTTPResponseError, defineAgent,
} = require('./common');


/**
 * A class for making requests to DFSP backend API
 */
class Requests {
    constructor(config) {
        this.config = config;
        this.logger = config.logger;
        this.retries = config.retries ?? DEFAULT_RETRIES_COUNT;
        // Switch or peer DFSP endpoint
        this.hubEndpoint = config.hubEndpoint;

        this.agent = defineAgent(this.hubEndpoint);
    }

    /**
     * Utility function for building outgoing request headers as required by the mojaloop api spec
     *
     * @returns {object} - headers object for use in requests to mojaloop api endpoints
     */
    _buildHeaders() {
        const JWT = new JWTSingleton();
        const token = JWT.getToken();

        const headers = makeJsonHeaders();

        if (token) {
            headers[AUTH_HEADER] = `Bearer ${token}`;
        }

        return headers;
    }

    async onRetry(error) {
        const { statusCode } = error?.getData?.().res || error || {};
        const needLogin = [401, 403].includes(statusCode);
        if (needLogin) {
            this.logger.push({ error }).log(`Retrying login due to error statusCode: ${statusCode}`);
            const JWT = new JWTSingleton();
            await JWT.login();
        }
    }

    async get(url) {
        return this.#sendRequestWithRetry(url, 'GET');
    }

    async delete(url) {
        return this.#sendRequestWithRetry(url, 'DELETE');
    }

    async put(url, body) {
        return this.#sendRequestWithRetry(url, 'PUT', body);
    }

    async post(url, body) {
        return this.#sendRequestWithRetry(url, 'POST', body);
    }

    async #sendRequestWithRetry(url, method, body = null) {
        return await retry(async () => {
            const headers = this._buildHeaders();
            const uri = buildUrl(this.hubEndpoint, url);
            const reqOpts = {
                method,
                uri,
                headers,
                ...(body ? { body: JSON.stringify(body) } : null),
            };
            this.logger.push({ reqOpts }).log(`Executing HTTP ${method}`);

            return request({ ...reqOpts, agent: this.agent })
              .then(throwOrJson)
              .catch((e) => {
                  this.logger.push({ e }).log(`Error attempting HTTP ${method}`);
                  throw e;
              });
        }, {
            retries: this.retries,
            onRetry: this.onRetry.bind(this),
        });
    }
}

module.exports = {
    Requests,
    HTTPResponseError,
};
