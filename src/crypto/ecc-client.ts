import * as crypto from 'crypto'
import { type ECCClientOptions, type RequestData, type RequestResponse } from './types'
import { logger } from '@/utils/logger'

/**
 * client for encrypted communication using ecc
 */
export class ECCClient {
  private readonly curve: string
  public privateKey: string = ''
  public publicKey: string = ''
  public serverPublicKey: string | null = null
  private readonly options: Required<ECCClientOptions>

  /**
   * creates a new ecc client
   * @param options - configuration options
   */
  constructor (options: ECCClientOptions = {}) {
    this.options = {
      debug: options.debug ?? false,
      curve: options.curve ?? 'prime256v1',
      logLevel: options.logLevel ?? 'debug'
    }

    this.curve = this.options.curve
    this.generateKeyPair()
  }

  /**
   * generates a new key pair
   */
  public generateKeyPair (): void {
    const ecdh = crypto.createECDH(this.curve)
    ecdh.generateKeys()
    this.privateKey = ecdh.getPrivateKey('hex')
    this.publicKey = ecdh.getPublicKey('hex')

    logger.debug('new key pair generated')
    logger.debug(`private key (first 10 chars): ${this.privateKey.substring(0, 10)}...`)
    logger.debug(`public key (first 10 chars): ${this.publicKey.substring(0, 10)}...`)
  }

  /**
   * checks if server public key is available
   */
  public hasServerPublicKey (): boolean {
    return this.serverPublicKey !== null
  }

  /**
   * gets the client's public key
   */
  public getPublicKey (): string {
    return this.publicKey
  }

  /**
   * encrypts data using the server's public key
   * @param data - data to encrypt
   * @param serverPublicKey - server's public key
   * @returns encrypted data in base64
   */
  public encrypt (data: RequestData, serverPublicKey: string): string {
    if (!serverPublicKey) {
      throw new Error('server public key not provided')
    }

    logger.debug('starting data encryption')

    // create ephemeral pair for this communication
    const ephemeralECDH = crypto.createECDH(this.curve)
    ephemeralECDH.generateKeys()
    const ephemeralPublicKey = ephemeralECDH.getPublicKey('hex')

    // generate shared secret
    const sharedSecret = ephemeralECDH.computeSecret(Buffer.from(serverPublicKey, 'hex'))

    // derive keys
    const hash = crypto.createHash('sha256')
    hash.update(sharedSecret)
    const derivedKey = hash.digest()

    const aesKey = derivedKey.slice(0, 32)
    const hmacKey = Buffer.concat([derivedKey, Buffer.from('HMAC_KEY')])

    // add public key to data
    const dataWithPublicKey = { ...data, clientPublicKey: this.publicKey }
    const jsonData = JSON.stringify(dataWithPublicKey)

    // encrypt with aes-gcm
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv)
    const encrypted = Buffer.concat([cipher.update(jsonData, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    // generate client identifier
    const clientIdHash = crypto.createHash('sha256')
      .update(this.publicKey)
      .digest('hex')
      .slice(0, 8)

    const timestamp = Math.floor(Date.now() / 1000).toString()

    // build data for authentication
    const dataToAuthenticate = Buffer.concat([
      Buffer.from(clientIdHash),
      Buffer.from(':'),
      Buffer.from(ephemeralPublicKey),
      Buffer.from(':'),
      Buffer.from(iv.toString('base64')),
      Buffer.from(':'),
      Buffer.from(encrypted.toString('base64')),
      Buffer.from(':'),
      Buffer.from(authTag.toString('base64')),
      Buffer.from(':'),
      Buffer.from(timestamp)
    ])

    // generate hmac
    const hmac = crypto.createHmac('sha256', hmacKey)
      .update(dataToAuthenticate)
      .digest('base64')

    logger.debug('encryption completed')

    // concatenate all elements
    return Buffer.concat([
      dataToAuthenticate,
      Buffer.from(':'),
      Buffer.from(hmac)
    ]).toString('base64')
  }

  /**
   * decrypts data using the client's private key
   * @param encryptedBundle - encrypted data in base64
   * @returns decrypted data
   */
  public decrypt<T = any>(encryptedBundle: string): T {
    logger.debug('starting decryption')

    const parts = Buffer.from(encryptedBundle, 'base64').toString().split(':')

    if (parts.length !== 7) {
      throw new Error(`invalid format: ${parts.length} parts`)
    }

    const clientId = parts[0]
    const ephemeralPublicKey = parts[1]
    const iv = Buffer.from(parts[2], 'base64')
    const encryptedData = Buffer.from(parts[3], 'base64')
    const authTag = Buffer.from(parts[4], 'base64')
    const timestamp = parseInt(parts[5], 10)
    const receivedHmac = parts[6]

    logger.debug(`client id: ${clientId}`)
    logger.debug(`timestamp: ${timestamp} (${new Date(timestamp * 1000).toISOString()})`)

    // check expiration
    const currentTime = Math.floor(Date.now() / 1000)
    if (currentTime - timestamp > 300) {
      throw new Error('data expired')
    }

    // recreate shared secret
    const ecdh = crypto.createECDH(this.curve)
    ecdh.setPrivateKey(Buffer.from(this.privateKey, 'hex'))
    const sharedSecret = ecdh.computeSecret(Buffer.from(ephemeralPublicKey, 'hex'))

    // derive keys
    const hash = crypto.createHash('sha256')
    hash.update(sharedSecret)
    const derivedKey = hash.digest()

    const aesKey = derivedKey.slice(0, 32)
    const hmacKey = Buffer.concat([derivedKey, Buffer.from('HMAC_KEY')])

    // recreate data for authentication
    const dataToAuthenticate = Buffer.concat([
      Buffer.from(clientId),
      Buffer.from(':'),
      Buffer.from(ephemeralPublicKey),
      Buffer.from(':'),
      Buffer.from(parts[2]),
      Buffer.from(':'),
      Buffer.from(parts[3]),
      Buffer.from(':'),
      Buffer.from(parts[4]),
      Buffer.from(':'),
      Buffer.from(parts[5])
    ])

    // verify hmac
    const expectedHmac = crypto.createHmac('sha256', hmacKey)
      .update(dataToAuthenticate)
      .digest('base64')

    if (expectedHmac !== receivedHmac) {
      throw new Error('invalid hmac')
    }

    logger.debug('hmac validated successfully')

    // decrypt
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()])

    try {
      const result = JSON.parse(decrypted.toString('utf8'))
      logger.debug('decryption completed successfully')
      return result as T
    } catch (e) {
      logger.debug('could not convert to json, returning raw text')
      return decrypted.toString('utf8') as unknown as T
    }
  }

  /**
   * retrieves the server's public key
   * @param baseUrl - api base url
   * @returns server's public key
   */
  public async getServerPublicKey (baseUrl: string): Promise<string> {
    logger.debug(`getting server public key from ${baseUrl}`)

    try {
      const keyEndpoint = `${baseUrl}/api/v4/keys/public`

      const response = await fetch(keyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientPublicKey: this.publicKey })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`error ${response.status}: ${errorText}`)
      }

      const data = await response.json() as { serverPublicKey?: string }
      if (!data.serverPublicKey) {
        throw new Error('response missing public key')
      }

      this.serverPublicKey = data.serverPublicKey
      logger.debug(`server public key obtained: ${this.serverPublicKey.substring(0, 10)}...`)
      return this.serverPublicKey
    } catch (error) {
      logger.error(`error getting public key: ${(error as Error).message}`)
      throw error
    }
  }

  /**
   * executes an encrypted request
   * @param endpoint - full endpoint url
   * @param data - data to send
   * @returns request response
   */
  public async makeRequest<T = any>(endpoint: string, data: RequestData): Promise<RequestResponse<T>> {
    logger.debug(`making request to ${endpoint}`)

    try {
      // extract base url
      const urlObj = new URL(endpoint)
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`

      // get server public key if needed
      if (!this.serverPublicKey) {
        await this.getServerPublicKey(baseUrl)
      }

      if (!this.serverPublicKey) {
        throw new Error('could not obtain server public key')
      }

      // encrypt data
      const encryptedData = this.encrypt(data, this.serverPublicKey)

      // build url with encrypted data
      const url = `${endpoint}?ENC=${encodeURIComponent(encryptedData)}`

      // send request
      const startTime = Date.now()

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000

      // check response
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`error ${response.status}: ${errorText}`)
      }

      // process response
      const responseText = await response.text()

      try {
        // try to parse as json
        const responseData = JSON.parse(responseText)

        // decrypt if needed
        if (responseData.ENC) {
          logger.debug('encrypted response detected, decrypting...')
          const decryptedData = this.decrypt<T>(responseData.ENC)

          return {
            status: response.status,
            duration,
            responseData: decryptedData
          }
        }

        return {
          status: response.status,
          duration,
          responseData: responseData as T
        }
      } catch (e) {
        return {
          status: response.status,
          duration,
          responseText
        }
      }
    } catch (error) {
      logger.error(`error during request: ${(error as Error).message}`)
      throw error
    }
  }
}
