// Jest setup file for Passgage MCP Server tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PASSGAGE_BASE_URL = 'https://api.passgage.com';
process.env.PASSGAGE_API_KEY = 'test-api-key';
process.env.PASSGAGE_TIMEOUT = '30000';
process.env.PASSGAGE_DEBUG = 'false';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Global test timeout
jest.setTimeout(10000);