/* eslint-disable */
// TODO: Remove previous line and work through linting issues at next edit

/** ************************************************************************
 *  (C) Copyright ModusBox Inc. 2020 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Jose Sanchez - jose.sanchez@modusbox.com                   *
 ************************************************************************* */

const { JWTSingleton } = require('../requests/jwt');

class AuthModel {
    constructor(opts) {
        this._storage = opts.storage;
        this._logger = opts.logger;
        this._auth = opts.auth;
        this._hubEndpoint = opts.hubEndpoint;
    }

    async login() {
        const JWT = new JWTSingleton({
            auth: this._auth,
            logger: this._logger,
            hubEndpoint: this._hubEndpoint,
        });
        await JWT.login();
    }
}

module.exports = AuthModel;
