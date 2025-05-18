import DataHunterClient from '../src';
import { logger } from '../src/utils/logger';

/**
 * demonstrates a basic api request with the datahunter client
 */
async function basicRequestExample() {
  logger.info('initializing datahunter client');
  const client = new DataHunterClient({
    baseUrl: 'https://api-dh.ciphers.systems',
    options: {
      logLevel: 'debug'
    },
    apiKey: 'api-key'
  });

  try {
    logger.info('executing query by path');
    const result = await client.query.exec(
      '/api/v4/query/8a09296e3cc3f56ec615ba541664f517',
      [
        { name: 'cpf', value: '12345678901' },
        { name: 'name', value: 'John Doe' }
      ]
    );

    logger.info({
      status: result.status,
      duration: `${result.duration.toFixed(3)}s`,
      filePath: result.filePath
    }, 'query completed successfully');

    if (result.responseData) {
      logger.debug(result.responseData, 'query response data');
    }
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'request failed');
  }
}

if (require.main === module) {
  basicRequestExample().catch(err => {
    logger.fatal(err, 'unhandled error');
    process.exit(1);
  });
}

export default basicRequestExample;