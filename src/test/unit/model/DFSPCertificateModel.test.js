const sdkSC = require('@mojaloop/sdk-standard-components');
const { DFSPCertificateModel, AuthModel } = require('../../../lib/model');
const { JWTSingleton } = require('../../../lib/requests/jwt');
const { AUTH_HEADER, CONTENT_TYPES, ERROR_MESSAGES } = require('../../../lib/constants');
const mocks = require('../mocks');

jest.mock('@mojaloop/sdk-standard-components', () => ({
    ...jest.requireActual('@mojaloop/sdk-standard-components'),
    request: jest.fn(async () => mocks.mockOidcHttpResponse()),
}));

describe('DFSPCertificateModel Tests -->', () => {
    let token;

    beforeAll(async () => {
        const options = mocks.mockJwtOptions();
        const jwt = new JWTSingleton(options);
        expect(jwt.getToken()).toBeUndefined();

        const authModel = new AuthModel(options);
        await authModel.login();

        token = jwt.getToken();
        expect(token).toBe(mocks.mockOidcData().access_token);
    });

    test('should use access token as Authorization-header to do further calls to hub', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        await model.getDFSPCA();

        expect(sdkSC.request).toHaveBeenCalledTimes(2);
        const [requestArgs] = sdkSC.request.mock.calls[1];
        const {
            [AUTH_HEADER]: authHeader,
            'Content-Type': contentType,
        } = requestArgs.headers;
        expect(authHeader).toBe(`Bearer ${token}`);
        expect(contentType).toBe(CONTENT_TYPES.json);
    });

    test('should call external-dfsps endpoint on uploadExternalDfspJWS', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        await model.uploadExternalDfspJWS(mocks.mockUploadExternalDfspJWSData());

        expect(sdkSC.request).toHaveBeenCalledTimes(3);
        const [requestArgs] = sdkSC.request.mock.calls[2];
        expect(requestArgs.uri).toContain('/external-dfsps/jwscerts');
    });

    test('should throw error if hubEndpoint does not have protocol part', async () => {
        const options = mocks.mockModelOptions({
            hubEndpoint: 'hubEndpoint.com',
        });
        expect(() => new DFSPCertificateModel(options))
            .toThrowError(ERROR_MESSAGES.noProtocolInUrl);
    });

    test('should call uploadCSR endpoint on uploadExternalDfspJWS', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        await model.uploadCSR(mocks.mockUploadCSRData());

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain('/enrollments/inbound');
    });

    test('should call signInboundEnrollment endpoint ', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        const opts = mocks.mockModelOptions();
        await model.signInboundEnrollment(opts);

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain(`/enrollments/inbound/${opts.inboundEnrollmentId}/sign`);
    });

    test('should call getClientCertificate endpoint ', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        const opts = mocks.mockModelOptions();
        await model.getClientCertificate(opts);

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain(`/enrollments/inbound/${opts.inboundEnrollmentId}`);
    });

    test('should call getCertificates endpoint ', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        const opts = mocks.mockModelOptions();
        await model.getCertificates(opts);

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain('/enrollments/inbound');
    });

    test('should call uploadDFSPCA endpoint to upload DFSP CA Root and Intermediate certificates to MCM Server', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        const opts = mocks.mockModelOptions();
        await model.uploadDFSPCA(opts);

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain('/dfspId/ca');
    });

    test('should call getDFSPServerCertificates endpoint to retrieve DFSP Server Certificate, Root and Intermediate certificates from MCM Server', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        await model.getDFSPServerCertificates();

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain(`/dfsps/${mocks.mockModelOptions().dfspId}/servercerts`);
    });

    test('should call uploadServerCertificates endpoint to upload DFSP Server Certificate, Root and Intermediate certificates to MCM Server', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        const opts = mocks.mockModelOptions();
        await model.uploadServerCertificates(opts);

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain(`/dfsps/${mocks.mockModelOptions().dfspId}/servercerts`);
    });

    test('should call uploadJWS endpoint to upload DFSP JWS Certificate, Root and Intermediate certificates to MCM Server', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        const opts = mocks.mockModelOptions();
        await model.uploadJWS(opts);

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain(`/dfsps/${mocks.mockModelOptions().dfspId}/jwscerts`);
    });

    test('should call updateJWS endpoint to upload DFSP JWS Certificate, Root and Intermediate certificates to MCM Server', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        const opts = mocks.mockModelOptions();
        await model.updateJWS(opts);

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain(`/dfsps/${mocks.mockModelOptions().dfspId}/jwscerts`);
    });

    test('should call deleteJWS endpoint to delete DFSP JWS Certificate, Root and Intermediate certificates to MCM Server', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        const opts = mocks.mockModelOptions();
        await model.deleteJWS(opts);

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain(`/dfsps/${mocks.mockModelOptions().dfspId}/jwscerts`);
    });

    test('should call getDFSPJWSCertificates endpoint to get DFSP JWS Certificate, Root and Intermediate certificates from MCM Server', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        const opts = mocks.mockModelOptions();
        await model.getDFSPJWSCertificates(opts);

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain(`/dfsps/${mocks.mockModelOptions().dfspId}/jwscerts`);
    });

    test('should call getAllJWSCertificates endpoint to get **all** JWS Certificate, Root and Intermediate certificates from MCM Server', async () => {
        const model = new DFSPCertificateModel(mocks.mockModelOptions());
        await model.getAllJWSCertificates();

        expect(sdkSC.request).toHaveBeenCalledTimes(1);
        const [requestArgs] = sdkSC.request.mock.calls[0];
        expect(requestArgs.uri).toContain(`/dfsps/jwscerts`);
    });
});
