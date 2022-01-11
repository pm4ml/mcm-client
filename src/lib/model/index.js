/* eslint-disable */
// TODO: Remove previous line and work through linting issues at next edit

/** ************************************************************************
 *  (C) Copyright ModusBox Inc. 2019 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha - yevhen.kyriukha@modusbox.com                   *
 ************************************************************************* */

const DFSPEndpointModel = require('./DFSPEndpointModel');
const HubEndpointModel = require('./HubEndpointModel');
const HubCertificateModel = require('./HubCertificateModel');
const DFSPCertificateModel = require('./DFSPCertificateModel');
const DFSPConfigModel = require('./DFSPConfigModel');
const Storage = require('./Storage');
const MonetaryZoneModel = require('./MonetaryZoneModel');
const AuthModel = require('./AuthModel');
const ConnectorModel = require('./ConnectorModel');

module.exports = {
    DFSPEndpointModel,
    HubEndpointModel,
    HubCertificateModel,
    Storage,
    DFSPCertificateModel,
    DFSPConfigModel,
    MonetaryZoneModel,
    AuthModel,
    ConnectorModel,
};
