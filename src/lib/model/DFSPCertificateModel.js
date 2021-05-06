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

const { EmbeddedPKIEngine } = require('mojaloop-connection-manager-pki-engine');
const { Requests } = require('../requests');

class DFSPCertificateModel {
    constructor(opts) {
        this._dfspId = opts.dfspId;
        this._mcmServerRequest = new Requests({
            logger: opts.logger,
            hubEndpoint: opts.hubEndpoint,
        });
    }

    /**
     * Uploads DFSP CSR to MCM Server
     *
     * @param opts {object}
     * @param opts.csr {object}
     * @param opts.envId {string}
     */
    async uploadCSR(opts) {
        const url = `/environments/${opts.envId}/dfsps/${this._dfspId}/enrollments/inbound`;
        return this._mcmServerRequest.post(url, { clientCSR: opts.csr });
    }

    /**
     *
     * @param {object} opts
     * @param {number} opts.envId
     * @param {number} opts.inboundEnrollmentId
     */
    async signInboundEnrollment(opts) {
        const url = `/environments/${opts.envId}/dfsps/${this._dfspId}/enrollments/inbound/${opts.inboundEnrollmentId}/sign`;
        return this._mcmServerRequest.post(url, {});
    }

    /**
     *
     * @param {object} opts
     * @param {number} opts.envId
     * @param {number} opts.inboundEnrollmentId
     */
    async getClientCertificate(opts) {
        const url = `/environments/${opts.envId}/dfsps/${this._dfspId}/enrollments/inbound/${opts.inboundEnrollmentId}`;
        return this._mcmServerRequest.get(url);
    }

    /**
     * Creates DFSP CSR
     *
     * @param opts {object}
     * @param opts.csrParameters {object}
     */
    async createCSR(opts) {
        // Constructor parameters not needed for creating a CSR. Maybe createCSR could be static.
        const embeddedPKIEngine = new EmbeddedPKIEngine();

        const { csrParameters } = opts;
        return embeddedPKIEngine.createCSR(csrParameters.parameters, csrParameters.privateKeyLength, csrParameters.privateKeyAlgorithm);
    }

    /**
     * Gets uploaded DFSP CSRs and certificates from MCM Server
     *
     * @param opts {object}
     * @param opts.envId {string}
     * @param opts.dfspId {string}
     */
    async getCertificates(opts) {
        const url = `/environments/${opts.envId}/dfsps/${this._dfspId}/enrollments/inbound`;
        return this._mcmServerRequest.get(url);
    }

    /**
     * Gets uploaded DFSP CA from MCM Server
     *
     * @param opts {object}
     * @param opts.envId {string}
     * @param opts.dfspId {string}
     */
    async getDFSPCA(opts) {
        const url = `/environments/${opts.envId}/dfsps/${this._dfspId}/ca`;
        return this._mcmServerRequest.get(url);
    }

    /**
     * Uploads DFSP CA Root and Intermediate certificates to MCM Server
     *
     * @param opts {Object}
     * @param [opts.entry] {object}
     * @param opts.envId {string}
     */
    async uploadDFSPCA(opts) {
        const url = `/environments/${opts.envId}/dfsps/${this._dfspId}/ca`;
        return this._mcmServerRequest.post(url, opts.entry);
    }

    /**
     * Get DFSP Server Certificate, Root and Intermediate certificates to MCM Server
     *
     * @param opts {Object}
     * @param [opts.entry] {object}
     * @param opts.envId {string}
     */
    async getDFSPServerCertificates(opts) {
        const url = `/environments/${opts.envId}/dfsps/${this._dfspId}/servercerts`;
        return this._mcmServerRequest.get(url);
    }

    /**
     * Uploads DFSP Server Certificate, Root and Intermediate certificates to MCM Server
     *
     * @param opts {Object}
     * @param [opts.entry] {object}
     * @param opts.envId {string}
     */
    async uploadServerCertificates(opts) {
        const url = `/environments/${opts.envId}/dfsps/${this._dfspId}/servercerts`;
        return this._mcmServerRequest.post(url, opts.entry);
    }

    /**
     * Uploads DFSP JWS Certificate, Root and Intermediate certificates to MCM Server
     *
     * @param opts {Object}
     * @param [opts.entry] {object}
     * @param opts.envId {string}
     */
    async uploadJWS(opts) {
        const url = `/environments/${opts.envId}/dfsps/${this._dfspId}/jwscerts`;
        return this._mcmServerRequest.post(url, opts.entry);
    }

    /**
     * Uploads DFSP JWS Certificate, Root and Intermediate certificates to MCM Server
     *
     * @param opts {Object}
     * @param [opts.entry] {object}
     * @param opts.envId {string}
     */
    async updateJWS(opts) {
        const url = `/environments/${opts.envId}/dfsps/${this._dfspId}/jwscerts`;
        return this._mcmServerRequest.put(url, opts.entry);
    }

    /**
     * Deletes DFSP JWS Certificate from MCM Server
     *
     * @param opts {Object}
     * @param opts.envId {string}
     */
    async deleteJWS(opts) {
        const url = `/environments/${opts.envId}/dfsps/${this._dfspId}/jwscerts`;
        return this._mcmServerRequest.delete(url, opts.entry);
    }

    /**
     * Get DFSP JWS Certificate, Root and Intermediate certificates from MCM Server
     *
     * @param opts {Object}
     * @param opts.envId {string}
     */
    async getDFSPJWSCertificates(opts) {
        const url = `/environments/${opts.envId}/dfsps/${this._dfspId}/jwscerts`;
        return this._mcmServerRequest.get(url);
    }

    /**
     * Get *all* JWS Certificate, Root and Intermediate certificates from MCM Server
     *
     * @param opts {Object}
     * @param opts.envId {string}
     */
    async getAllJWSCertificates(opts) {
        const url = `/environments/${opts.envId}/dfsps/jwscerts`;
        return this._mcmServerRequest.get(url);
    }
}

module.exports = DFSPCertificateModel;
