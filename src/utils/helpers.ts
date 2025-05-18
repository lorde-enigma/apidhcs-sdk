import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { DEFAULT_RESULTS_DIR } from './constants'

/**
 * ensures results directory exists
 * @param dir - directory to check
 * @returns path to directory
 */
export function ensureResultsDir (dir: string = DEFAULT_RESULTS_DIR): string {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * saves a response to a file
 * @param data - data to save
 * @param dir - directory where to save
 * @param prefix - filename prefix
 * @returns path to saved file
 */
export function saveResponse (
  data: any,
  dir: string = DEFAULT_RESULTS_DIR,
  prefix: string = 'response'
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `${prefix}-${timestamp}.json`
  const filePath = path.join(dir, fileName)

  ensureResultsDir(dir)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))

  return filePath
}

/**
 * generates a random id
 * @param length - id length in bytes
 * @returns id in hex format
 */
export function generateId (length: number = 8): string {
  return crypto.randomBytes(length).toString('hex')
}
