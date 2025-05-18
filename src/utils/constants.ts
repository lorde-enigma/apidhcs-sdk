import * as path from 'path'

/** token expiration time in seconds */
export const TOKEN_EXPIRATION_TIME = 300

/** default ecc curve */
export const DEFAULT_ECC_CURVE = 'prime256v1'

/** default results directory */
export const DEFAULT_RESULTS_DIR = path.join(process.cwd(), 'results')
