import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from '../config/logger.js';

export class StdioTransport extends StdioServerTransport {
  constructor() {
    super();
    logger.debug('Stdio transport initialized');
    
    // Add error handling
    process.stdin.on('error', (error) => {
      logger.error('Stdin error:', { error });
    });
    
    process.stdout.on('error', (error) => {
      logger.error('Stdout error:', { error });
    });
    
    process.stderr.on('error', (error) => {
      logger.error('Stderr error:', { error });
    });
  }

  async close(): Promise<void> {
    logger.debug('Closing stdio transport');
    await super.close();
  }
}