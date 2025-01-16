const fs = require('fs');
const path = require('path');
const File = require('../../../../lib/model/Storage/File');

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        unlink: jest.fn(),
    },
}));

describe('File Storage', () => {
    let fileStorage;
    const mockDirName = '/mock/storage';
    const mockKey = 'testKey';
    const mockValue = 'testValue';

    beforeEach(() => {
        fileStorage = new File({ dirName: mockDirName });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('_getKeyPath', () => {
        it('should generate the correct file path for a given key', () => {
            const keyPath = fileStorage._getKeyPath(mockKey);
            expect(keyPath).toBe(path.join(mockDirName, mockKey));
        });
    });

    describe('getSecret', () => {
        it('should read the file content for a given key', async () => {
            fs.promises.readFile.mockResolvedValue(mockValue);

            const result = await fileStorage.getSecret(mockKey);
            expect(fs.promises.readFile).toHaveBeenCalledWith(
                path.join(mockDirName, mockKey),
            );
            expect(result).toBe(mockValue);
        });

        it('should handle errors when the file does not exist', async () => {
            fs.promises.readFile.mockRejectedValue(new Error('File not found'));

            await expect(fileStorage.getSecret(mockKey)).rejects.toThrow('File not found');
        });
    });

    describe('getSecretAsString', () => {
        it('should read the file content as a string for a given key', async () => {
            fs.promises.readFile.mockResolvedValue(mockValue);

            const result = await fileStorage.getSecretAsString(mockKey);
            expect(fs.promises.readFile).toHaveBeenCalledWith(
                path.join(mockDirName, mockKey),
                'utf-8',
            );
            expect(result).toBe(mockValue);
        });
    });

    describe('setSecret', () => {
        it('should write the value to the file for a given key', async () => {
            await fileStorage.setSecret(mockKey, mockValue);
            expect(fs.promises.writeFile).toHaveBeenCalledWith(
                path.join(mockDirName, mockKey),
                mockValue,
            );
        });

        it('should handle errors during file writing', async () => {
            fs.promises.writeFile.mockRejectedValue(new Error('Write error'));

            await expect(fileStorage.setSecret(mockKey, mockValue)).rejects.toThrow('Write error');
        });
    });

    describe('deleteSecret', () => {
        it('should delete the file for a given key', async () => {
            await fileStorage.deleteSecret(mockKey);
            expect(fs.promises.unlink).toHaveBeenCalledWith(
                path.join(mockDirName, mockKey),
            );
        });

        it('should handle errors during file deletion', async () => {
            fs.promises.unlink.mockRejectedValue(new Error('Delete error'));

            await expect(fileStorage.deleteSecret(mockKey)).rejects.toThrow('Delete error');
        });
    });
});
