import { type RequestData, type QueryParameter, type RequestResponse } from '@/crypto/types'
import { type DataHunterClient } from '@/client/dataHunter-client'

/**
 * executes a query using a specific id
 * @param this - datahunter client instance
 * @param queryId - id of the query
 * @param parameters - query parameters
 * @param apiKey - optional api key
 * @returns query result
 */
export async function executeById<T = any> (
  this: DataHunterClient,
  queryId: string,
  parameters: QueryParameter[],
  apiKey?: string
): Promise<RequestResponse<T>> {
  if (!queryId) {
    throw new Error('query id is required')
  }

  // prepare request data
  const requestData: RequestData = {
    parameters: Array.isArray(parameters) ? parameters : [],
    apikey: apiKey
  }

  // build endpoint
  const endpoint = `/api/v4/query/${queryId}`

  // execute request
  return this.request<T>(endpoint, requestData)
}

/**
 * executes a query using a query name
 * @param this - datahunter client instance
 * @param queryName - name of the query
 * @param parameters - query parameters
 * @param apiKey - optional api key
 * @returns query result
 */
export async function executeByName<T = any> (
  this: DataHunterClient,
  queryName: string,
  parameters: QueryParameter[],
  apiKey?: string
): Promise<RequestResponse<T>> {
  if (!queryName) {
    throw new Error('query name is required')
  }

  // prepare request data
  const requestData: RequestData = {
    queryName,
    parameters: Array.isArray(parameters) ? parameters : [],
    apikey: apiKey
  }

  // build endpoint
  const endpoint = '/api/v4/query'

  // execute request
  return this.request<T>(endpoint, requestData)
}
