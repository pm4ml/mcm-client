/* eslint-disable */
// TODO: Remove previous line and work through linting issues at next edit

/** ************************************************************************
 *  (C) Copyright ModusBox Inc. 2020 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Murthy Kakarlamudi - murthy@modusbox.com                   *
 ************************************************************************* */

const { Requests } = require('../requests');

class DFSPEnvConfigModel {
    constructor(opts) {
        this._dfspId = opts.dfspId;
        this._mcmServerRequest = new Requests({
            logger: opts.logger,
            hubEndpoint: opts.hubEndpoint,
        });
    }

    /**
     * Gets DFSPs details from MCM Server
     *
     * @param opts {object}
     * @param opts.envId {string}
     * @param opts.dfspId {string}
     */
    async getDFSPList(opts) {
        const url = `/environments/${opts.envId}/dfsps`;
        return this._mcmServerRequest.get(url);
    }

    /**
     * Gets DFSPs details from MCM Server by MonetaryZone
     *
     * @param opts {object}
     * @param opts.envId {string}
     * @param opts.monetaryZoneId {string}
     */
    async getDFSPListByMonetaryZone(opts) {
        const url = `/environments/${opts.envId}/monetaryzones/${opts.monetaryZoneId}/dfsps`;
        return this._mcmServerRequest.get(url);
    }
}

module.exports = DFSPEnvConfigModel;
