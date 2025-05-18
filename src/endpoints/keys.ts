import { type DataHunterClient } from '@/client'
import { logger } from '@/utils/logger'

/**
 * gets the server's public key
 * @param this - datahunter client instance
 * @returns server public key
 */
export async function getPublicKey (this: DataHunterClient): Promise<string> {
  try {
    const result = await this.crypto.getServerPublicKey(this.baseUrl)
    return result
  } catch (error) {
    logger.error(`error getting public key: ${(error as Error).message}`)
    throw error
  }
}

/**
 * resets the current public key and generates a new key pair
 * @param this - datahunter client instance
 * @returns information about the new keys
 */
export function resetKeys (this: DataHunterClient): {
  publicKey: string
  hasServerKey: boolean
} {
  this.crypto.serverPublicKey = null
  this.crypto.generateKeyPair()

  return {
    publicKey: this.crypto.getPublicKey(),
    hasServerKey: this.crypto.hasServerPublicKey()
  }
}
