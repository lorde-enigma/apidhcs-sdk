import * as crypto from 'crypto'
import { ECCClient } from '@/crypto'
import { type RequestData } from './types'

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn()
  }
}))
jest.mock('crypto', () => {
  const mockECDH = {
    generateKeys: jest.fn(),
    getPrivateKey: jest.fn().mockReturnValue('mock-private-key'),
    getPublicKey: jest.fn().mockReturnValue('mock-public-key'),
    computeSecret: jest.fn().mockReturnValue(Buffer.from('mock-shared-secret')),
    setPrivateKey: jest.fn()
  }
  return {
    createECDH: jest.fn().mockReturnValue(mockECDH),
    createHash: jest.fn().mockImplementation(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue(Buffer.from('mock-hash-result'))
    })),
    createHmac: jest.fn().mockImplementation(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mock-hmac')
    })),
    randomBytes: jest.fn().mockReturnValue(Buffer.from('mock-random-bytes')),
    createCipheriv: jest.fn().mockImplementation(() => ({
      update: jest.fn().mockReturnValue(Buffer.from('mock-encrypted-data')),
      final: jest.fn().mockReturnValue(Buffer.from('')),
      getAuthTag: jest.fn().mockReturnValue(Buffer.from('mock-auth-tag'))
    })),
    createDecipheriv: jest.fn().mockImplementation(() => ({
      update: jest.fn().mockReturnValue(Buffer.from('{"test":"data"}')),
      final: jest.fn().mockReturnValue(Buffer.from('')),
      setAuthTag: jest.fn()
    }))
  }
})
global.fetch = jest.fn()

describe('ECCClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Date, 'now').mockImplementation(() => 1609459200000)
  })
  describe('constructor', () => {
    it('should create instance with default options', () => {
      const client = new ECCClient()
      expect(client.privateKey).toBe('mock-private-key')
      expect(client.publicKey).toBe('mock-public-key')
      expect(client.serverPublicKey).toBeNull()
      expect(crypto.createECDH).toHaveBeenCalledWith('prime256v1')
    })
    it('should create instance with custom options', () => {
      const client = new ECCClient({ curve: 'secp256k1' })
      expect(crypto.createECDH).toHaveBeenCalledWith('secp256k1')
    })
  })
  describe('generateKeyPair', () => {
    it('should generate a new key pair', () => {
      const client = new ECCClient()
      jest.clearAllMocks()
      client.generateKeyPair()
      expect(crypto.createECDH).toHaveBeenCalled()
      expect(client.privateKey).toBe('mock-private-key')
      expect(client.publicKey).toBe('mock-public-key')
    })
  })
  describe('hasServerPublicKey', () => {
    it('should return false when server public key is null', () => {
      const client = new ECCClient()
      client.serverPublicKey = null
      expect(client.hasServerPublicKey()).toBe(false)
    })
    it('should return true when server public key is available', () => {
      const client = new ECCClient()
      client.serverPublicKey = 'server-public-key'
      expect(client.hasServerPublicKey()).toBe(true)
    })
  })
  describe('getPublicKey', () => {
    it('should return the public key', () => {
      const client = new ECCClient()
      expect(client.getPublicKey()).toBe('mock-public-key')
    })
  })
  describe('encrypt', () => {
    it('should throw error if server public key is not provided', () => {
      const client = new ECCClient()
      expect(() => client.encrypt({ test: 'data' } satisfies RequestData, '')).toThrow('server public key not provided')
    })
    it('should encrypt data successfully', () => {
      const client = new ECCClient()
      const data: RequestData = { test: 'data' }
      const result = client.encrypt(data, 'server-public-key')
      expect(result).toBeTruthy()
      expect(crypto.createECDH).toHaveBeenCalled()
      expect(crypto.createCipheriv).toHaveBeenCalled()
      expect(crypto.createHmac).toHaveBeenCalled()
    })
  })
  describe('decrypt', () => {
    it('should throw error for invalid format', () => {
      const client = new ECCClient()
      jest.spyOn(Buffer, 'from').mockImplementationOnce(() => ({
        toString: () => '1:2:3'
      } as unknown as Buffer))
      expect(() => client.decrypt('invalid-format')).toThrow('invalid format: 3 parts')
    })
    it('should decrypt data successfully', () => {
      const client = new ECCClient()
      const timestamp = Math.floor(Date.now() / 1000)
      jest.spyOn(Buffer, 'from').mockImplementationOnce(() => ({
        toString: () => `id:ephemeral:iv:data:tag:${timestamp}:mock-hmac`
      } as unknown as Buffer))
      const result = client.decrypt('valid-encrypted-data')
      expect(result).toEqual({ test: 'data' })
      expect(crypto.createDecipheriv).toHaveBeenCalled()
    })
  })
  describe('getServerPublicKey', () => {
    it('should fetch and store server public key', async () => {
      const client = new ECCClient()
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ serverPublicKey: 'server-public-key' })
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse)
      const result = await client.getServerPublicKey('https://api.example.com')
      expect(result).toBe('server-public-key')
      expect(client.serverPublicKey).toBe('server-public-key')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v4/keys/public',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('clientPublicKey')
        })
      )
    })
    it('should throw error if response is not ok', async () => {
      const client = new ECCClient()
      const mockResponse = {
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('Not Found')
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse)
      await expect(client.getServerPublicKey('https://api.example.com')).rejects.toThrow('error 404: Not Found')
    })
    it('should throw error if response is missing public key', async () => {
      const client = new ECCClient()
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({})
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse)
      await expect(client.getServerPublicKey('https://api.example.com')).rejects.toThrow('response missing public key')
    })
  })
  describe('makeRequest', () => {
    it('should make a request with encryption', async () => {
      const client = new ECCClient()
      client.serverPublicKey = 'server-public-key'
      const encryptSpy = jest.spyOn(client, 'encrypt').mockReturnValue('encrypted-data')
      const mockResponse = {
        status: 200,
        text: jest.fn().mockResolvedValue('{"success":true}')
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse)
      const result = await client.makeRequest('https://api.example.com/endpoint', { test: 'data' } satisfies RequestData)
      expect(result).toEqual({
        status: 200,
        duration: expect.any(Number),
        responseData: { success: true }
      })
      expect(encryptSpy).toHaveBeenCalledWith({ test: 'data' }, 'server-public-key')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.example.com/endpoint?ENC='),
        expect.objectContaining({ method: 'GET' })
      )
    })
    it('should fetch server public key if not available', async () => {
      const client = new ECCClient()
      client.serverPublicKey = null
      const getKeysSpy = jest.spyOn(client, 'getServerPublicKey').mockImplementation(async () => {
        client.serverPublicKey = 'server-public-key';
        return 'server-public-key';
      });
      jest.spyOn(client, 'encrypt').mockReturnValue('encrypted-data')
      const mockResponse = {
        status: 200,
        text: jest.fn().mockResolvedValue('{"success":true}')
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse)
      await client.makeRequest('https://api.example.com/endpoint', { test: 'data' } satisfies RequestData)
      expect(getKeysSpy).toHaveBeenCalledWith('https://api.example.com')
    })
    it('should decrypt encrypted response', async () => {
      const client = new ECCClient()
      client.serverPublicKey = 'server-public-key'
      jest.spyOn(client, 'encrypt').mockReturnValue('encrypted-data')
      const mockResponse = {
        status: 200,
        text: jest.fn().mockResolvedValue('{"ENC":"encrypted-response"}')
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse)
      const decryptSpy = jest.spyOn(client, 'decrypt').mockReturnValue({ decrypted: true })
      const result = await client.makeRequest('https://api.example.com/endpoint', { test: 'data' } satisfies RequestData)
      expect(result).toEqual({
        status: 200,
        duration: expect.any(Number),
        responseData: { decrypted: true }
      })
      expect(decryptSpy).toHaveBeenCalledWith('encrypted-response')
    })
    it('should handle non-JSON responses', async () => {
      const client = new ECCClient()
      client.serverPublicKey = 'server-public-key'
      jest.spyOn(client, 'encrypt').mockReturnValue('encrypted-data')
      const mockResponse = {
        status: 200,
        text: jest.fn().mockResolvedValue('plain text response')
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse)
      jest.spyOn(JSON, 'parse').mockImplementationOnce(() => {
        throw new Error('Invalid JSON')
      })
      const result = await client.makeRequest('https://api.example.com/endpoint', { test: 'data' } satisfies RequestData)
      expect(result).toEqual({
        status: 200,
        duration: expect.any(Number),
        responseText: 'plain text response'
      })
    })
  })
})
