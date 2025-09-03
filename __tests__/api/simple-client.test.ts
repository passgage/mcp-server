import { jest } from '@jest/globals';

// Simple mock for testing basic functionality
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  defaults: { headers: { common: {} } },
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance)
}));

jest.mock('../../src/config/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

import { PassgageAPIClient } from '../../src/api/client.js';

describe('PassgageAPIClient Basic', () => {
  it('should create client successfully', () => {
    const client = new PassgageAPIClient({
      baseURL: 'https://api.test.com',
      timeout: 30000
    });
    
    expect(client).toBeInstanceOf(PassgageAPIClient);
  });

  it('should have authentication methods', () => {
    const client = new PassgageAPIClient({
      baseURL: 'https://api.test.com'
    });
    
    expect(typeof client.setApiKey).toBe('function');
    expect(typeof client.getAuthMode).toBe('function');
    expect(typeof client.hasValidAuth).toBe('function');
  });

  it('should have HTTP methods', () => {
    const client = new PassgageAPIClient({
      baseURL: 'https://api.test.com'
    });
    
    expect(typeof client.get).toBe('function');
    expect(typeof client.post).toBe('function');
    expect(typeof client.put).toBe('function');
    expect(typeof client.patch).toBe('function');
    expect(typeof client.delete).toBe('function');
  });
});