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
const { AUTH_HEADER } = require('../constants');
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

        this.transportScheme = config.transportScheme ?? 'http';
        // Switch or peer DFSP endpoint
        this.hubEndpoint = `${this.transportScheme}://${config.hubEndpoint}`;
        // todo: clarify, why scheme is separated from hubEndpoint url?

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
        const JWT = new JWTSingleton();
        await JWT.login(); // todo: think, if we need to do login on any error!
        console.log(`Retrying HTTP GET because ${error}`);
    }

    async get(url) {
        return await retry(async () => {
            const headers = this._buildHeaders();
            const reqOpts = {
                method: 'GET',
                uri: buildUrl(this.hubEndpoint, url),
                headers,
            };

            this.logger.push({ reqOpts }).log('Executing HTTP GET');
            // if anything throws, we retry
            return request({ ...reqOpts, agent: this.agent })
                .then(throwOrJson)
                .catch((e) => {
                    this.logger.push({ e }).log('Error attempting HTTP GET');
                    throw e;
                });
        }, {
            retries: 2,
            onRetry: this.onRetry,
        });
    }

    async delete(url) {
        return await retry(async () => {
            const headers = this._buildHeaders();
            const reqOpts = {
                method: 'DELETE',
                uri: buildUrl(this.hubEndpoint, url),
                headers,
            };

            this.logger.push({ reqOpts }).log('Executing HTTP DELETE');
            return request({ ...reqOpts, agent: this.agent })
                .then(throwOrJson)
                .catch((e) => {
                    this.logger.push({ e }).log('Error attempting HTTP DELETE');
                    throw e;
                });
        }, {
            retries: 2,
            onRetry: this.onRetry,
        });
    }

    async put(url, body) {
        return await retry(async () => {
            const headers = this._buildHeaders();
            const reqOpts = {
                method: 'PUT',
                uri: buildUrl(this.hubEndpoint, url),
                headers,
                body: JSON.stringify(body),
            };

            this.logger.push({ reqOpts }).log('Executing HTTP PUT');
            return request({ ...reqOpts, agent: this.agent })
                .then(throwOrJson)
                .catch((e) => {
                    this.logger.push({ e }).log('Error attempting HTTP PUT');
                    throw e;
                });
        }, {
            retries: 2,
            onRetry: this.onRetry,
        });
    }

    async post(url, bodyParam) {
        return await retry(async () => {
            const headers = this._buildHeaders();
            const body = JSON.stringify(bodyParam);
            const reqOpts = {
                method: 'POST',
                uri: buildUrl(this.hubEndpoint, url),
                headers,
                body,
            };

            this.logger.push({ reqOpts }).log('Executing HTTP POST');
            return request({ ...reqOpts, agent: this.agent })
                .then(throwOrJson)
                .catch((e) => {
                    this.logger.push({ e }).log('Error attempting POST.');
                    throw e;
                });
        }, {
            retries: 2,
            onRetry: this.onRetry,
        });
    }
}

module.exports = {
    Requests,
    HTTPResponseError,
};
