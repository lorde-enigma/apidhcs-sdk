import { getPublicKey } from '@/endpoints/keys';
import { logger } from '@/utils/logger';
import { type DataHunterClient } from '@/client/dh-client';

jest.mock('@/utils/logger', () => ({
    logger: {
        error: jest.fn(),
    },
}));

describe('getPublicKey', () => {
    let mockClient: Partial<DataHunterClient> | any
    beforeEach(() => {
        jest.clearAllMocks();
        mockClient = {
            baseUrl: 'https://test-server.com',
            crypto: {
                getServerPublicKey: jest.fn(),
            },
        } as unknown as Partial<DataHunterClient>;
    });
    it('should return the server public key when successful', async () => {
        const expectedPublicKey = 'test-public-key';
        mockClient.crypto.getServerPublicKey = jest.fn().mockResolvedValue(expectedPublicKey);
        const result = await getPublicKey.call(mockClient);
        expect(result).toBe(expectedPublicKey);
        expect(mockClient.crypto.getServerPublicKey).toHaveBeenCalledWith(mockClient.baseUrl);
        expect(logger.error).not.toHaveBeenCalled();
    });
    it('should throw and log error when getServerPublicKey fails', async () => {
        const testError = new Error('Failed to get public key');
        mockClient.crypto.getServerPublicKey = jest.fn().mockRejectedValue(testError);
        await expect(getPublicKey.call(mockClient)).rejects.toThrow(testError);
        expect(mockClient.crypto.getServerPublicKey).toHaveBeenCalledWith(mockClient.baseUrl);
        expect(logger.error).toHaveBeenCalledWith(`error getting public key: ${testError.message}`);
    });
});