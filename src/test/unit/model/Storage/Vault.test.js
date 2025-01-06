const vault = require('node-vault');
const Vault = require('../../../../lib/model/Storage/Vault');

jest.mock('node-vault'); // Mock the `node-vault` library

describe('Vault', () => {
    let vaultInstance;
    let mockVault;
    const mockEndpoint = 'http://127.0.0.1:8200';
    const mockToken = 'mock-token';
    const mockRoleId = 'mock-role-id';

    beforeEach(() => {
        // Create a mocked `node-vault` instance
        mockVault = {
            unwrap: jest.fn(),
            approleLogin: jest.fn(),
            read: jest.fn(),
            write: jest.fn(),
            delete: jest.fn(),
        };
        vault.mockReturnValue(mockVault);

        // Create the Vault instance
        vaultInstance = new Vault({
            endpoint: mockEndpoint,
            token: mockToken,
            roleId: mockRoleId,
        });
    });

    describe('constructor', () => {
        it('should initialize with the provided options', () => {
            expect(vault).toHaveBeenCalledWith({
                apiVersion: 'v1',
                endpoint: mockEndpoint,
                token: mockToken,
            });
            expect(vaultInstance._roleId).toBe(mockRoleId);
        });
    });

    describe('connect', () => {
        it('should unwrap and log in with approle', async () => {
            const mockSecretId = 'mock-secret-id';
            const mockClientToken = 'mock-client-token';

            mockVault.unwrap.mockResolvedValueOnce({ data: { secret_id: mockSecretId } });

            // Simulate a promise object that contains { auth: { client_token } }
            mockVault.approleLogin.mockReturnValueOnce(
                Promise.resolve({ auth: { client_token: mockClientToken } }),
            );

            await vaultInstance.connect();

            expect(mockVault.unwrap).toHaveBeenCalled();
            expect(mockVault.approleLogin).toHaveBeenCalledWith({
                role_id: mockRoleId,
                secret_id: mockSecretId,
            });
            expect(vault).toHaveBeenCalledWith({
                apiVersion: 'v1',
                endpoint: 'http://127.0.0.1:8200',
                token: mockClientToken,
            });
        });
    });

    describe('getSecret', () => {
        it('should read a secret from the Vault', async () => {
            const key = 'test-key';
            const mockSecret = { data: { value: 'test-value' } };

            vaultInstance._clientVault = mockVault;
            mockVault.read.mockResolvedValueOnce(mockSecret);

            const result = await vaultInstance.getSecret(key);

            expect(mockVault.read).toHaveBeenCalledWith(`secret/mcm-client/${key}`);
            expect(result).toBe(mockSecret);
        });
    });

    describe('setSecret', () => {
        it('should write a secret to the Vault', async () => {
            const key = 'test-key';
            const value = { data: { value: 'test-value' } };

            vaultInstance._clientVault = mockVault;
            mockVault.write.mockResolvedValueOnce(value);

            const result = await vaultInstance.setSecret(key, value);

            expect(mockVault.write).toHaveBeenCalledWith(`secret/mcm-client/${key}`, value);
            expect(result).toBe(value);
        });
    });

    describe('deleteSecret', () => {
        it('should delete a secret from the Vault', async () => {
            const key = 'test-key';

            vaultInstance._clientVault = mockVault;
            mockVault.delete.mockResolvedValueOnce({});

            const result = await vaultInstance.deleteSecret(key);

            expect(mockVault.delete).toHaveBeenCalledWith(`secret/mcm-client/${key}`);
            expect(result).toEqual({});
        });
    });

    describe('disconnect', () => {
        it('should handle disconnect logic (currently unimplemented)', () => {
            // Test placeholder for disconnect
            expect(() => vaultInstance.disconnect()).not.toThrow();
        });
    });
});
