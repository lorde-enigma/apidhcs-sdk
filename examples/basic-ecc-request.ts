import DataHunterClient from '../src';
import { logger } from '../src/utils/logger';

/**
 * demonstrates a basic api request with the datahunter client
 */
async function basicRequestExample() {
  logger.info('initializing datahunter client');
  const client = new DataHunterClient('https://api-dh.ciphers.systems', {
    logLevel: 'debug',
    saveResponses: true
  });
  
  try {
    logger.info('executing query by id');
    const result = await client.query.executeById(
      '5a03296e37c3f56ec603ba541664f217',
      [
        { name: 'cpf', value: '12345678901' },
        { name: 'name', value: 'John Doe' }
      ],
      'your-api-key-here'
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