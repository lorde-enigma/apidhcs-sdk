import { ECCClient } from '@/crypto/ecc-client'
import { type RequestData, type RequestResponse } from '@/crypto/types'
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

  /** api key */
  public readonly apiKey: string = ''

  /** configuration options */
  private readonly options: Required<DataHunterClientOptions>

  /** crypto client */
  public readonly crypto: ECCClient

  /** query endpoints */
  public readonly query: {
    exec: <T = any>(
      path: string,
      parameters?: Array<{ name: string, value: string | number | boolean }>
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
  constructor ({ baseUrl, apiKey, options }: { baseUrl: string, apiKey?: string, options?: DataHunterClientOptions }) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    this.apiKey = apiKey ?? process.env.DH_API_KEY ?? ''

    this.options = {
      resultsDir: options?.resultsDir ?? DEFAULT_RESULTS_DIR,
      debug: options?.debug ?? false,
      logLevel: options?.logLevel ?? 'debug',
      saveResponses: options?.saveResponses ?? false,
      cryptoOptions: {
        curve: options?.cryptoOptions?.curve ?? 'prime256v1',
        debug: (options?.cryptoOptions?.debug ?? options?.debug) ?? false,
        logLevel: (options?.cryptoOptions?.logLevel ?? options?.logLevel) ?? 'debug'
      }
    }

    // update logger level if specified
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
      exec: async <T = any>(
        path: string,
        parameters?: Array<{ name: string, value: string | number | boolean }>
      ): Promise<RequestResponse<T>> => {
        // normalize the path to ensure it starts with a slash
        const normalizedPath = path.startsWith('/') ? path : `/${path}`

        // build the request data
        const requestData: RequestData = {
          parameters: Array.isArray(parameters) ? parameters : [],
          apikey: this.apiKey
        }

        // build the full URL properly
        const fullUrl = `${this.baseUrl}${normalizedPath}`
        logger.debug(`executing query to path: ${path}`)
        logger.debug(`full URL: ${fullUrl}`)

        // call the request method with the correct URL and data
        return this.request<T>(fullUrl, requestData)
      }
    }

    this.keys = {
      getPublicKey: async () => endpoints.keys.getPublicKey.call(this),
      resetKeys: () => endpoints.keys.resetKeys.call(this)
    }
  }

  /**
   * executes an encrypted request to an endpoint
   * @param url - full URL for the request
   * @param data - data to send
   * @returns processed response
   */
  public async request<T = any>(url: string, data: RequestData): Promise<RequestResponse<T>> {
    logger.debug(`starting request to: ${url}`)

    // get server public key if needed
    if (!this.crypto.hasServerPublicKey()) {
      await this.keys.getPublicKey()
    }

    // make request with encryption
    const response = await this.crypto.makeRequest<T>(url, data)

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
