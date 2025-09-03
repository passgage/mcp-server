import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { StdioTransport } from './stdio.js';
import { HttpTransport } from './http.js';

export type TransportType = 'stdio' | 'http' | 'websocket';

export function createTransport(type: TransportType = 'stdio'): Transport {
  switch (type) {
    case 'stdio':
      return new StdioTransport();
    case 'http':
    case 'websocket':
      return new HttpTransport({ type });
    default:
      throw new Error(`Unsupported transport type: ${type}`);
  }
}

export { StdioTransport } from './stdio.js';
export { HttpTransport } from './http.js';