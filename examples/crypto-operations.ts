import DataHunterClient from '../src';
import { logger } from '../src/utils/logger';

/**
 * demonstrates direct use of cryptography functions
 */
async function cryptoOperationsExample() {
  logger.info('initializing datahunter client');
  const client = new DataHunterClient({
    baseUrl: 'https://api-dh.ciphers.systems',
    options: {
      logLevel: 'debug'
    }
  });

  try {
    logger.info('accessing crypto utilities');
    const cryptoUtils = client.getCryptoUtils();

    logger.info('retrieving server public key');
    const serverKey = await client.keys.getPublicKey();
    logger.debug(`server key obtained: ${serverKey.substring(0, 20)}...`);

    logger.info('testing manual encryption');
    const testData = { message: 'encryption test', timestamp: new Date().toISOString() };

    logger.debug(testData, 'data to encrypt');
    const encrypted = cryptoUtils.encrypt(testData, serverKey);
    logger.debug(`encrypted data (first 50 chars): ${encrypted.substring(0, 50)}...`);

    logger.info('generating new key pair');
    cryptoUtils.generateKeyPair();
    logger.debug('new key pair generated');

    logger.info('cryptography examples completed');
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'crypto operation failed');
  }
}

if (require.main === module) {
  cryptoOperationsExample().catch(err => {
    logger.fatal(err, 'unhandled error');
    process.exit(1);
  });
}

export default cryptoOperationsExample;