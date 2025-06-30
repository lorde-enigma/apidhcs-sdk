/**
 * configuration options for the ecc client
 */
export interface ECCClientOptions {
  /** enables detailed logs */
  debug?: boolean
  /** cryptographic curve to use */
  curve?: string
  /** log level */
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent'
}

/**
 * response from a request
 */
export interface RequestResponse<T = any> {
  /** request duration in seconds */
  duration: number
  /** response data (if json or decrypted data) */
  responseData?: T
  /** response text (if not json) */
  responseText?: string
  /** path where response was saved (if applicable) */
  filePath?: string
}

/**
 * parameter for queries
 */
export interface QueryParameter {
  /** parameter name */
  name: string
  /** parameter value */
  value: string | number | boolean
}

/**
 * data for request
 */
export interface RequestData {
  /** api key */
  apikey?: string
  /** query parameters */
  parameters?: QueryParameter[]
  /** additional fields */
  [key: string]: any
}
