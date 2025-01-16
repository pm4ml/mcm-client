const ConnectorModel = require('../../../lib/model/ConnectorModel');
const ControlServer = require('../../../lib/control-server');

jest.mock('../../../lib/control-server');

describe('ConnectorModel', () => {
    let mockStorage;
    let mockLogger;
    let mockOpts;
    let connectorModel;
    beforeEach(() => {
        mockStorage = {};
        mockLogger = { log: jest.fn() };
        mockOpts = {
            storage: mockStorage,
            logger: mockLogger,
            wsUrl: 'ws://test-url',
            wsPort: 4002,
            dfspCaPath: '/path/to/dfspCa',
            tlsServerPrivateKey: 'privateKey',
        };
        connectorModel = new ConnectorModel(mockOpts);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('reconfigureInboundSdk', () => {
        it('should log and send the correct configuration', async () => {
            const mockClient = {
                send: jest.fn(),
                receive: jest.fn().mockResolvedValue({
                    data: {
                        inbound: { tls: { creds: {} } },
                    },
                }),
            };

            ControlServer.Client.Create.mockResolvedValue(mockClient);
            ControlServer.build = {
                CONFIGURATION: {
                    READ: jest.fn(() => 'READ_COMMAND'),
                    PATCH: jest.fn(() => 'PATCH_COMMAND'),
                },
            };

            const csrPrivateKey = 'mockPrivateKey';
            const inServerCert = 'mockServerCert';
            const dfspCA = 'mockDfspCA';

            await connectorModel.reconfigureInboundSdk(csrPrivateKey, inServerCert, dfspCA);

            expect(mockLogger.log).toHaveBeenCalledWith(
                'About to reconfigure sdk through websocket ws://test-url and port 4002 ',
            );

            expect(ControlServer.Client.Create).toHaveBeenCalledWith({
                address: 'ws://test-url',
                port: 4002,
                logger: mockLogger,
            });

            expect(mockClient.send).toHaveBeenCalledWith('READ_COMMAND');
            expect(mockClient.receive).toHaveBeenCalled();

            expect(mockClient.send).toHaveBeenCalledWith('PATCH_COMMAND');
        });
    });

    describe('reconfigureOutboundSdk', () => {
        it('should log and send the correct outbound configuration', async () => {
            const mockClient = {
                send: jest.fn(),
                receive: jest.fn().mockResolvedValue({
                    data: {
                        outbound: { tls: { creds: {} } },
                    },
                }),
            };

            ControlServer.Client.Create.mockResolvedValue(mockClient);
            ControlServer.build = {
                CONFIGURATION: {
                    READ: jest.fn(() => 'READ_COMMAND'),
                    PATCH: jest.fn(() => 'PATCH_COMMAND'),
                },
            };

            const rootHubCA = 'mockRootHubCA';
            const key = 'mockKey';
            const certificate = 'mockCertificate';

            await connectorModel.reconfigureOutboundSdk(rootHubCA, key, certificate);

            expect(ControlServer.Client.Create).toHaveBeenCalledWith({
                address: 'ws://test-url',
                port: 4003,
                logger: mockLogger,
            });

            expect(mockClient.send).toHaveBeenCalledWith('READ_COMMAND');
            expect(mockClient.receive).toHaveBeenCalled();

            expect(mockClient.send).toHaveBeenCalledWith('PATCH_COMMAND');
        });
    });
});
