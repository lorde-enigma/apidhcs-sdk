import { logger } from '../src/utils/logger';
import basicRequestExample from './basic-ecc-request';
import cryptoOperationsExample from './crypto-operations';
import keyManagementExample from './key-management';

type ExampleName = 'basic-request' | 'crypto-operations' | 'key-management' | 'all' | 'help';

/**
 * displays available commands
 */
function showHelp(): void {
  console.log(`
DataHunter Client Examples
--------------------------
Usage: npm run example -- [option]

Options:
  --basic-request      Run the basic ECC request example
  --crypto-operations  Run the cryptography operations example
  --key-management     Run the key management example
  --all                Run all examples sequentially (default)
  --help               Show this help message

Examples:
  npm run example -- --basic-request
  npm run example -- --all
`);
}

/**
 * runs a specific example by name
 * @param name - example name to run
 */
async function runExample(name: ExampleName): Promise<void> {
  switch (name) {
    case 'basic-request':
      logger.info('=== RUNNING BASIC REQUEST EXAMPLE ===');
      await basicRequestExample();
      break;
      
    case 'crypto-operations':
      logger.info('=== RUNNING CRYPTO OPERATIONS EXAMPLE ===');
      await cryptoOperationsExample();
      break;
      
    case 'key-management':
      logger.info('=== RUNNING KEY MANAGEMENT EXAMPLE ===');
      await keyManagementExample();
      break;
      
    case 'all':
      await runFullDemo();
      break;
      
    case 'help':
      showHelp();
      break;
    default:
      console.log(`unknown example name: ${name}`);
      showHelp();
      break;
    
  }
}

/**
 * runs all examples in sequence
 */
async function runFullDemo(): Promise<void> {
  logger.info('=== DATAHUNTER CLIENT FULL DEMO ===');
  
  // set log level
  logger.level = 'info';
  
  try {
    logger.info('\n\n=== EXAMPLE 1: BASIC REQUEST ===');
    await basicRequestExample();
    
    logger.info('\n\n=== EXAMPLE 2: CRYPTO OPERATIONS ===');
    await cryptoOperationsExample();
    
    logger.info('\n\n=== EXAMPLE 3: KEY MANAGEMENT ===');
    await keyManagementExample();
    
    logger.info('\n\n=== FULL DEMO COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'demo failed');
  }
}

/**
 * parses command line arguments and determines which example to run
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    await runExample('help');
    return;
  }
  
  const arg = args[0].toLowerCase();
  
  if (arg === '--basic-request') {
    await runExample('basic-request');
  } else if (arg === '--crypto-operations') {
    await runExample('crypto-operations');
  } else if (arg === '--key-management') {
    await runExample('key-management');
  } else if (arg === '--all') {
    await runExample('all');
  } else if (arg === '--help' || arg === '-h') {
    showHelp();
  } else {
    console.log(`unknown option: ${arg}`);
    showHelp();
  }
}

if (require.main === module) {
  main().catch(err => {
    logger.fatal(err, 'unhandled error in example runner');
    process.exit(1);
  });
}