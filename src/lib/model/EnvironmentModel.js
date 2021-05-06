/* eslint-disable */
// TODO: Remove previous line and work through linting issues at next edit

/** ************************************************************************
 *  (C) Copyright ModusBox Inc. 2020 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha - yevhen.kyriukha@modusbox.com                   *
 ************************************************************************* */

const { Requests } = require('../requests');

class EnvironmentModel {
    constructor(opts) {
        this._hubRequest = new Requests({
            logger: opts.logger,
            hubEndpoint: opts.hubEndpoint,
        });
    }

    async findAll() {
        return this._hubRequest.get('/environments');
    }

    async findById(id) {
        return this._hubRequest.get(`/environments/${id}`);
    }

    async create(values) {
        return this._hubRequest.post('/environments', values);
    }

    async delete(envId) {
        return this._hubRequest.get(`/environments/${envId}`);
    }

    async findStatus(envId, dfspId) {
        return this._hubRequest.get(`/environments/${envId}/dfsps/${dfspId}/status`);
    }    
}

module.exports = EnvironmentModel;
