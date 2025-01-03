const ws = require('ws');
const { Client } = require('../../../lib/control-server'); // Assuming the class is exported from a file named Client.js

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
      serializedMessage
    );
    expect(loggerMock.log).toHaveBeenCalledWith(
      'Websocket client information :: ',
      client.url
    );
    expect(ws.prototype.send).toHaveBeenCalledWith(serializedMessage, expect.any(Function));
  });

  it('should handle string messages in send', async () => {
    const client = new Client({ address: 'example.com', port: 1234, logger: loggerMock });

    const message = 'Hello World';

    await client.send(message);

    expect(loggerMock.log).toHaveBeenCalledWith(
      'Send msg as a client through websocket :: ',
      message
    );
    expect(ws.prototype.send).toHaveBeenCalledWith(message, expect.any(Function));
  });
});

