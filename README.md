# apidhcs-sdk

a secure typescript client for interacting with the datahunter api, featuring end-to-end encryption using elliptic curve cryptography (ecc).

## features

- end-to-end encryption: all communication with the api is secured using ecc
- public/private key management: automatic key generation and exchange
- simple query interface: easy-to-use methods for data querying
- response management: options for saving and processing responses
- detailed logging: configurable logging levels for debugging

## installation

npm install datahunter

## quick start

import DataHunterClient from 'datahunter';
import { logger } from 'datahunter/utils/logger';

async function quickExample() {
  // initialize the client
  const client = new DataHunterClient({
    baseUrl: 'https://api-example.com',
    apiKey: 'your-api-key',
    options: {
      logLevel: 'info'
    }
  });

  try {
    // execute a query
    const result = await client.query.exec(
      '/api/v4/query/your-query-id',
      [
        { name: 'param1', value: 'value1' },
        { name: 'param2', value: 'value2' }
      ]
    );

    logger.info({
      status: result.status,
      duration: `${result.duration.toFixed(3)}s`,
      filePath: result.filePath
    }, 'Query completed successfully');

    if (result.responseData) {
      logger.info(result.responseData, 'Query response data');
    }
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Request failed');
  }
}

## architecture

the datahunter client is built with a focus on security, using elliptic curve cryptography to ensure that data is securely transmitted. the architecture includes:

- client layer: manages overall communication with the api
- crypto layer: handles encryption, decryption, and key management
- endpoints layer: implements specific api endpoints
- utils layer: provides logging, file management, and helper functions

## client configuration

the client accepts the following configuration options:

interface DataHunterClientOptions {
  // directory to save query results
  resultsDir?: string;
  // enable debug mode
  debug?: boolean;
  // set logging level
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';
  // automatically save responses
  saveResponses?: boolean;
  // crypto client options
  cryptoOptions?: {
    curve?: string;
    debug?: boolean;
    logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';
  }
}

## key management

the client automatically handles key generation and exchange:

// get the current client public key
const publicKey = client.crypto.getPublicKey();

// reset keys (generates a new key pair)
const resetResult = client.keys.resetKeys();

// fetch the server's public key
const serverKey = await client.keys.getPublicKey();

## directly using crypto operations

you can access the crypto utilities directly:

// get crypto utilities
const cryptoUtils = client.getCryptoUtils();

// manually encrypt data
const encrypted = cryptoUtils.encrypt(data, serverPublicKey);

// generate new key pair
cryptoUtils.generateKeyPair();

## query execution

to execute a query:

const result = await client.query.exec(
  '/api/v4/query/your-query-id',
  [
    { name: 'param1', value: 'value1' },
    { name: 'param2', value: 'value2' }
  ]
);

// results contain:
// - status: HTTP status code
// - duration: Request duration in milliseconds
// - responseData: The decrypted response data
// - filePath: Path to saved response (if saveResponses is enabled)

## response handling

responses can be automatically saved to disk:

const client = new DataHunterClient({
  baseUrl: 'https://api-example.com',
  options: {
    saveResponses: true,
    resultsDir: './my-results'
  }
});

## development

### building the project

npm run build

### running tests

npm run test

### running examples

npm run example

## license

ISC