import { ECCClient } from '@/crypto/ecc-client'
import { type QueryParameter, type RequestData, type RequestResponse } from '@/crypto/types'
import * as endpoints from '@/endpoints'
import { ensureResultsDir, saveResponse } from '@/utils/helpers'
import { DEFAULT_RESULTS_DIR } from '@/utils/constants'
import { logger } from '@/utils/logger'

/**
 * configuration options for the datahunter client
 */
export interface DataHunterClientOptions {
  /** directory to save results */
  resultsDir?: string
  /** debug mode */
  debug?: boolean
  /** log level */
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent'
  /** automatically save responses */
  saveResponses?: boolean
  /** crypto client options */
  cryptoOptions?: {
    curve?: string
    debug?: boolean
    logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent'
  }
}

/**
 * main client for communicating with the datahunter api
 */
export class DataHunterClient {
  /** api base url */
  public readonly baseUrl: string

  /** configuration options */
  private readonly options: Required<DataHunterClientOptions>

  /** crypto client */
  public readonly crypto: ECCClient

  /** query endpoints */
  public readonly query: {
    executeById: <T = any>(
      queryId: string,
      parameters: Array<{ name: string, value: string | number | boolean }>,
      apiKey?: string
    ) => Promise<RequestResponse<T>>

    executeByName: <T = any>(
      queryName: string,
      parameters: Array<{ name: string, value: string | number | boolean }>,
      apiKey?: string
    ) => Promise<RequestResponse<T>>
  }

  /** key management endpoints */
  public readonly keys: {
    getPublicKey: () => Promise<string>
    resetKeys: () => { publicKey: string, hasServerKey: boolean }
  }

  /**
   * creates a new datahunter client
   * @param baseUrl - api base url (e.g., "https://api-dh.ciphers.systems")
   * @param options - additional options
   */
  constructor (baseUrl: string, options: DataHunterClientOptions = {}) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

    this.options = {
      resultsDir: options.resultsDir ?? DEFAULT_RESULTS_DIR,
      debug: options.debug ?? false,
      logLevel: options.logLevel ?? 'debug',
      saveResponses: options.saveResponses ?? false,
      cryptoOptions: {
        curve: options.cryptoOptions?.curve ?? 'prime256v1',
        debug: (options.cryptoOptions?.debug ?? options.debug) ?? false,
        logLevel: (options.cryptoOptions?.logLevel ?? options.logLevel) ?? 'debug'
      }
    }

    // Update logger level if specified
    if (this.options.logLevel && logger.level !== this.options.logLevel) {
      logger.level = this.options.logLevel
    }

    // create results directory if it doesn't exist
    ensureResultsDir(this.options.resultsDir)

    // initialize crypto client
    this.crypto = new ECCClient({
      debug: this.options.cryptoOptions.debug,
      curve: this.options.cryptoOptions.curve,
      logLevel: this.options.cryptoOptions.logLevel
    })

    // initialize endpoints with wrapper functions to preserve generic types
    this.query = {
      executeById: async <T = any>(queryId: string, parameters: Array<{ name: string, value: string | number | boolean }>, apiKey?: string) => {
        return endpoints.query.executeById.call<DataHunterClient, [string, QueryParameter[], string?], Promise<RequestResponse<T>>>(
          this,
          queryId,
          parameters,
          apiKey
        )
      },

      executeByName: async <T = any>(queryName: string, parameters: Array<{ name: string, value: string | number | boolean }>, apiKey?: string) => {
        return endpoints.query.executeByName.call<DataHunterClient, [string, QueryParameter[], string?], Promise<RequestResponse<T>>>(
          this,
          queryName,
          parameters,
          apiKey
        )
      }
    }

    this.keys = {
      getPublicKey: async () => endpoints.keys.getPublicKey.call(this),
      resetKeys: () => endpoints.keys.resetKeys.call(this)
    }
  }

  /**
   * gets the full url for an endpoint
   * @param endpoint - relative endpoint path
   * @returns full url
   */
  public getFullUrl (endpoint: string): string {
    const relativePath = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint
    return `${this.baseUrl}/${relativePath}`
  }

  /**
   * executes an encrypted request to an endpoint
   * @param endpoint - relative endpoint
   * @param data - data to send
   * @returns processed response
   */
  public async request<T = any>(endpoint: string, data: RequestData): Promise<RequestResponse<T>> {
    const fullUrl = this.getFullUrl(endpoint)
    logger.debug(`starting request to: ${fullUrl}`)

    // get server public key if needed
    if (!this.crypto.hasServerPublicKey()) {
      await this.keys.getPublicKey()
    }

    // make request with encryption
    const response = await this.crypto.makeRequest<T>(fullUrl, data)

    // process and save response if configured
    if (response.responseData && this.options.saveResponses) {
      const filePath = saveResponse(
        response.responseData,
        this.options.resultsDir,
        'response'
      )

      response.filePath = filePath
      logger.debug(`response saved to: ${filePath}`)
    }

    return response
  }

  /**
   * logs a message using the pino logger
   * @param message - message to log
   * @param obj - optional object to include in log
   */
  public log (message: string, obj?: Record<string, any>): void {
    if (obj) {
      logger.debug(obj, message.toLowerCase())
    } else {
      logger.debug(message.toLowerCase())
    }
  }

  /**
   * directly access crypto functions
   * @returns crypto utility functions
   */
  public getCryptoUtils () {
    return {
      encrypt: (data: RequestData, serverPublicKey: string) =>
        this.crypto.encrypt(data, serverPublicKey),

      decrypt: <T = any>(encryptedBundle: string) =>
        this.crypto.decrypt<T>(encryptedBundle),

      generateKeyPair: () => { this.crypto.generateKeyPair() }
    }
  }
}
