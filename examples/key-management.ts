import DataHunterClient from '../src';
import { logger } from '../src/utils/logger';

/**
 * demonstrates key management operations
 */
async function keyManagementExample() {
  logger.info('initializing datahunter client');
  const client = new DataHunterClient('https://api-dh.ciphers.systems', {
    logLevel: 'debug'
  });
  
  try {
    const initialKey = client.crypto.getPublicKey();
    logger.info(`initial client public key: ${initialKey.substring(0, 15)}...`);
    
    logger.info('fetching server public key');
    const serverKey = await client.keys.getPublicKey();
    logger.info(`server public key: ${serverKey.substring(0, 15)}...`);
    
    logger.info('resetting keys');
    const resetResult = client.keys.resetKeys();
    logger.info({
      newPublicKey: `${resetResult.publicKey.substring(0, 15)}...`,
      hasServerKey: resetResult.hasServerKey
    }, 'keys reset');
    
    logger.info('fetching server public key after reset');
    const newServerKey = await client.keys.getPublicKey();
    logger.info(`new server public key: ${newServerKey.substring(0, 15)}...`);
    
    logger.info('key management examples completed');
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'key management operation failed');
  }
}

if (require.main === module) {
  keyManagementExample().catch(err => {
    logger.fatal(err, 'unhandled error');
    process.exit(1);
  });
}

export default keyManagementExample;