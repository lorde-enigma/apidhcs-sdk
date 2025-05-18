import { DataHunterClient } from '@/client';
import { ECCClient } from '@/crypto';
import * as endpoints from '@/endpoints';
import { ensureResultsDir, saveResponse } from '@/utils/helpers';
import { logger } from '@/utils/logger';

jest.mock('@/crypto/ecc-client');
jest.mock('@/endpoints');
jest.mock('@/utils/helpers');
jest.mock('@/utils/logger');

describe('DataHunterClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (ECCClient as jest.Mock).mockClear();
    });
    describe('constructor', () => {
        it('should initialize with default options', () => {
            const client = new DataHunterClient({ baseUrl: 'https://api.example.com' });
            expect(client.baseUrl).toBe('https://api.example.com');
            expect(client.apiKey).toBe('');
            expect(ensureResultsDir).toHaveBeenCalled();
            expect(ECCClient).toHaveBeenCalledWith(expect.objectContaining({
                curve: 'prime256v1',
                debug: false,
                logLevel: 'debug'
            }));
        });
        it('should remove trailing slash from baseUrl', () => {
            const client = new DataHunterClient({ baseUrl: 'https://api.example.com/' });
            expect(client.baseUrl).toBe('https://api.example.com');
        });
        it('should use provided API key', () => {
            const client = new DataHunterClient({
                baseUrl: 'https://api.example.com',
                apiKey: 'test-api-key'
            });
            expect(client.apiKey).toBe('test-api-key');
        });
        it('should use custom options', () => {
            const client = new DataHunterClient({
                baseUrl: 'https://api.example.com',
                options: {
                    resultsDir: '/custom/path',
                    debug: true,
                    logLevel: 'trace',
                    saveResponses: true,
                    cryptoOptions: {
                        curve: 'secp256k1',
                        debug: true,
                        logLevel: 'trace'
                    }
                }
            });
            expect(ensureResultsDir).toHaveBeenCalledWith('/custom/path');
            expect(ECCClient).toHaveBeenCalledWith(expect.objectContaining({
                curve: 'secp256k1',
                debug: true,
                logLevel: 'trace'
            }));
            expect(logger.level).toBe('trace');
        });
    });
    describe('request', () => {
        it('should fetch server public key if not available', async () => {
            const mockCrypto = {
                hasServerPublicKey: jest.fn().mockReturnValue(false),
                makeRequest: jest.fn().mockResolvedValue({ responseData: { result: 'success' } })
            };
            (ECCClient as jest.Mock).mockImplementation(() => mockCrypto);
            const mockGetPublicKey = jest.fn().mockResolvedValue('mock-public-key');
            (endpoints.keys.getPublicKey as jest.Mock).mockImplementation(() => mockGetPublicKey());
            const client = new DataHunterClient({ baseUrl: 'https://api.example.com' });
            await client.request('https://api.example.com/test', { parameters: [], apikey: '' });
            expect(mockGetPublicKey).toHaveBeenCalled();
            expect(mockCrypto.makeRequest).toHaveBeenCalled();
        });
        it('should save response when saveResponses is true', async () => {
            const mockCrypto = {
                hasServerPublicKey: jest.fn().mockReturnValue(true),
                makeRequest: jest.fn().mockResolvedValue({ responseData: { result: 'success' } })
            };
            (ECCClient as jest.Mock).mockImplementation(() => mockCrypto);
            (saveResponse as jest.Mock).mockReturnValue('/path/to/saved/response.json');
            const client = new DataHunterClient({
                baseUrl: 'https://api.example.com',
                options: { saveResponses: true }
            });
            const response = await client.request('https://api.example.com/test', { parameters: [], apikey: '' });
            expect(saveResponse).toHaveBeenCalled();
            expect(response.filePath).toBe('/path/to/saved/response.json');
        });
    });
    describe('query.exec', () => {
        it('should normalize path and make request', async () => {
            const mockCrypto = {
                hasServerPublicKey: jest.fn().mockReturnValue(true),
                makeRequest: jest.fn().mockResolvedValue({ responseData: { result: 'success' } })
            };
            (ECCClient as jest.Mock).mockImplementation(() => mockCrypto);
            const client = new DataHunterClient({ baseUrl: 'https://api.example.com' });
            const requestSpy = jest.spyOn(client, 'request');
            await client.query.exec('test-path', [{ name: 'param', value: 'value' }]);
            expect(requestSpy).toHaveBeenCalledWith(
                'https://api.example.com/test-path',
                expect.objectContaining({
                    parameters: [{ name: 'param', value: 'value' }],
                    apikey: ''
                })
            );
        });
    });
    describe('keys methods', () => {
        it('should call endpoints.keys.getPublicKey', async () => {
            const mockGetPublicKey = jest.fn().mockResolvedValue('mock-public-key');
            (endpoints.keys.getPublicKey as jest.Mock).mockImplementation(() => mockGetPublicKey());
            const client = new DataHunterClient({ baseUrl: 'https://api.example.com' });
            await client.keys.getPublicKey();
            expect(endpoints.keys.getPublicKey).toHaveBeenCalled();
        });
        it('should call endpoints.keys.resetKeys', () => {
            const mockResetKeys = jest.fn().mockReturnValue({ publicKey: 'new-key', hasServerKey: false });
            (endpoints.keys.resetKeys as jest.Mock).mockImplementation(() => mockResetKeys());
            const client = new DataHunterClient({ baseUrl: 'https://api.example.com' });
            const result = client.keys.resetKeys();
            expect(endpoints.keys.resetKeys).toHaveBeenCalled();
            expect(result).toEqual({ publicKey: 'new-key', hasServerKey: false });
        });
    });
    describe('getCryptoUtils', () => {
        it('should return crypto utility functions', () => {
            const mockCrypto = {
                encrypt: jest.fn(),
                decrypt: jest.fn(),
                generateKeyPair: jest.fn()
            };
            (ECCClient as jest.Mock).mockImplementation(() => mockCrypto);
            const client = new DataHunterClient({ baseUrl: 'https://api.example.com' });
            const utils = client.getCryptoUtils();
            expect(utils).toHaveProperty('encrypt');
            expect(utils).toHaveProperty('decrypt');
            expect(utils).toHaveProperty('generateKeyPair');
            utils.encrypt({ parameters: [], apikey: '' }, 'server-key');
            expect(mockCrypto.encrypt).toHaveBeenCalledWith({ parameters: [], apikey: '' }, 'server-key');
        });
    });
});