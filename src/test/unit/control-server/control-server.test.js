const ws = require('ws');
const { Client } = require('../../../lib/control-server'); // Assuming the class is exported from a file named Client.js
const {
    Server, MESSAGE, VERB,
} = require('../../../lib/control-server');

jest.mock('ws');

describe('Client', () => {
    let loggerMock;

    beforeEach(() => {
    // Mock logger
        loggerMock = {
            log: jest.fn(),
        };

        // Mock ws behavior
        ws.mockClear();
        ws.prototype.send = jest.fn((data, callback) => callback());
        ws.prototype.on = jest.fn((event, callback) => {
            if (event === 'open') callback();
        });
        ws.prototype.once = jest.fn();
    });

    it('should construct a Client with the correct properties', () => {
        const client = new Client({ address: 'example.com', port: 1234, logger: loggerMock });

        expect(ws).toHaveBeenCalledWith('ws://example.com:1234');
        expect(client._logger).toBe(loggerMock);
    });

    it('should expose the Build getter', () => {
        const client = new Client({ address: 'example.com', port: 1234, logger: loggerMock });

        expect(client.Build).toBeDefined();
    });

    it('should create a new Client instance using the Create static method', async () => {
        const client = await Client.Create({ address: 'example.com', port: 1234, logger: loggerMock });

        expect(client).toBeInstanceOf(Client);
        expect(ws.prototype.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    it('should throw an error if the websocket fails to open during Create', async () => {
        ws.prototype.on = jest.fn((event, callback) => {
            if (event === 'error') callback(new Error('Connection failed'));
        });

        await expect(Client.Create({ address: 'example.com', port: 1234, logger: loggerMock }))
            .rejects.toThrow('Connection failed');
    });

    it('should log and send a message through the websocket', async () => {
        const client = new Client({ address: 'example.com', port: 1234, logger: loggerMock });

        const message = { type: 'test', payload: 'data' };
        const serializedMessage = JSON.stringify(message);

        await client.send(message);

        expect(loggerMock.log).toHaveBeenCalledWith(
            'Send msg as a client through websocket :: ',
            serializedMessage,
        );
        expect(loggerMock.log).toHaveBeenCalledWith(
            'Websocket client information :: ',
            client.url,
        );
        expect(ws.prototype.send).toHaveBeenCalledWith(serializedMessage, expect.any(Function));
    });

    it('should handle string messages in send', async () => {
        const client = new Client({ address: 'example.com', port: 1234, logger: loggerMock });

        const message = 'Hello World';

        await client.send(message);

        expect(loggerMock.log).toHaveBeenCalledWith(
            'Send msg as a client through websocket :: ',
            message,
        );
        expect(ws.prototype.send).toHaveBeenCalledWith(message, expect.any(Function));
    });

    it('should correctly receive and deserialise a single message', async () => {
        const client = new Client({ address: 'example.com', port: 1234, logger: loggerMock });
        const mockData = JSON.stringify({ msg: 'testMessage', id: 1 });
        const mockSocket = ws.mock.instances[0];

        // Mock the once method to simulate a message event
        mockSocket.once.mockImplementation((event, callback) => {
            if (event === 'message') {
                callback(mockData);
            }
        });

        const receivedMessage = await client.receive();

        expect(receivedMessage).toEqual({ msg: 'testMessage', id: 1 });
        expect(mockSocket.once).toHaveBeenCalledWith('message', expect.any(Function));
    });
});

describe('Server', () => {
    let loggerMock;
    let server;
    beforeEach(() => {
        loggerMock = {
            log: jest.fn(),
            push: jest.fn(() => loggerMock),
        };

        ws.Server.mockClear();
        ws.Server.prototype.on = jest.fn();
        ws.Server.prototype.close = jest.fn((callback) => callback && callback());
        ws.Server.prototype.clients = new Set();

        server = new Server({ logger: loggerMock, port: 1234, appConfig: { key: 'value' } });
    });
    it('should initialize with correct properties', () => {
        expect(server._logger).toBe(loggerMock);
        expect(server._port).toBe(1234);
        expect(server._appConfig).toEqual({ key: 'value' });
        expect(server._clientData).toBeInstanceOf(Map);
        expect(ws.Server).toHaveBeenCalledWith({ clientTracking: true, port: 1234 });
    });
    it('should handle errors and shut down the process', () => {
        const processExitMock = jest.spyOn(process, 'exit').mockImplementation(() => {});
        const errorHandler = ws.Server.prototype.on.mock.calls.find(([event]) => event === 'error')[1];

        errorHandler(new Error('Test error'));

        expect(loggerMock.push).toHaveBeenCalledWith({ err: expect.any(Error) });
        expect(loggerMock.log).toHaveBeenCalledWith('Unhandled websocket error occurred. Shutting down.');
        expect(processExitMock).toHaveBeenCalledWith(1);

        processExitMock.mockRestore();
    });
    it('should handle client connections', () => {
        const connectionHandler = ws.Server.prototype.on.mock.calls.find(([event]) => event === 'connection')[1];
        const mockSocket = { on: jest.fn() };
        const mockReq = {
            url: '/test',
            socket: { remoteAddress: '127.0.0.1' },
            connection: { remoteAddress: '127.0.0.1' },
            headers: {},
        };

        connectionHandler(mockSocket, mockReq);

        expect(loggerMock.push).toHaveBeenCalledWith({
            url: '/test',
            ip: ['127.0.0.1'],
            remoteAddress: '127.0.0.1',
        });
        expect(loggerMock.log).toHaveBeenCalledWith('Websocket connection received');
        expect(server._clientData.has(mockSocket)).toBe(true);

        const closeHandler = mockSocket.on.mock.calls.find(([event]) => event === 'close')[1];
        closeHandler(1000, 'Normal closure');

        expect(loggerMock.push).toHaveBeenCalledWith({ code: 1000, reason: 'Normal closure' });
        expect(loggerMock.log).toHaveBeenCalledWith('Websocket connection closed');
        expect(server._clientData.has(mockSocket)).toBe(false);
    });

    it('should handle client messages', () => {
        const connectionHandler = ws.Server.prototype.on.mock.calls.find(([event]) => event === 'connection')[1];
        const mockSocket = { on: jest.fn(), send: jest.fn() };
        const mockReq = {
            url: '/test',
            socket: { remoteAddress: '127.0.0.1' },
            connection: { remoteAddress: '127.0.0.1' },
            headers: {},
        };

        connectionHandler(mockSocket, mockReq);

        const messageHandler = mockSocket.on.mock.calls.find(([event]) => event === 'message')[1];
        const validMessage = JSON.stringify({ msg: MESSAGE.CONFIGURATION, verb: VERB.READ });

        messageHandler(validMessage);

        expect(mockSocket.send).toHaveBeenCalledWith('{"verb":"NOTIFY","msg":"CONFIGURATION","data":{"key":"value"},"id":1}');
    });

    it('should notify all clients of the current configuration', async () => {
        const mockSocket = { send: jest.fn((msg, callback) => callback && callback()) };
        ws.Server.prototype.clients.add(mockSocket);

        await server.notifyClientsOfCurrentConfig();

        expect(mockSocket.send).toHaveBeenCalledWith('{"verb":"NOTIFY","msg":"CONFIGURATION","data":{"key":"value"},"id":2}', expect.any(Function));
    });

    it('should stop the server and log shutdown', async () => {
        await server.stop();

        expect(ws.Server.prototype.close).toHaveBeenCalled();
        expect(loggerMock.log).toHaveBeenCalledWith('Control server shutdown complete');
    });

    it('should reconfigure logger and appConfig', () => {
        const newLoggerMock = {
            log: jest.fn(),
            push: jest.fn(() => newLoggerMock),
        };

        const reconfigureFn = server.reconfigure({ logger: newLoggerMock, port: 1234, appConfig: { newKey: 'newValue' } });

        expect(() => reconfigureFn()).not.toThrow();
        expect(server._logger).toBe(newLoggerMock);
        expect(server._appConfig).toEqual({ newKey: 'newValue' });
    });
});
