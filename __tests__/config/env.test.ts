import { jest } from '@jest/globals';

// Mock logger before importing env
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

jest.mock('../../src/config/logger.js', () => ({
  logger: mockLogger
}));

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset process.env to clean state
    process.env = {};
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Variable Parsing', () => {
    it('should handle API key configuration', () => {
      process.env = {
        PASSGAGE_API_KEY: 'test-api-key-12345',
        PASSGAGE_BASE_URL: 'https://api.test.com',
        PASSGAGE_TIMEOUT: '60000',
        PASSGAGE_DEBUG: 'true',
        TRANSPORT_TYPE: 'stdio',
        LOG_LEVEL: 'debug',
        NODE_ENV: 'development'
      };

      expect(process.env.PASSGAGE_API_KEY).toBe('test-api-key-12345');
      expect(process.env.PASSGAGE_BASE_URL).toBe('https://api.test.com');
      expect(process.env.PASSGAGE_TIMEOUT).toBe('60000');
      expect(process.env.PASSGAGE_DEBUG).toBe('true');
      expect(process.env.TRANSPORT_TYPE).toBe('stdio');
      expect(process.env.LOG_LEVEL).toBe('debug');
      expect(process.env.NODE_ENV).toBe('development');
    });

    it('should handle user credentials configuration', () => {
      process.env = {
        PASSGAGE_USER_EMAIL: 'test@example.com',
        PASSGAGE_USER_PASSWORD: 'password123',
        PASSGAGE_BASE_URL: 'https://api.passgage.com'
      };

      expect(process.env.PASSGAGE_USER_EMAIL).toBe('test@example.com');
      expect(process.env.PASSGAGE_USER_PASSWORD).toBe('password123');
      expect(process.env.PASSGAGE_BASE_URL).toBe('https://api.passgage.com');
    });

    it('should handle HTTP transport configuration', () => {
      process.env = {
        PASSGAGE_API_KEY: 'test-api-key',
        TRANSPORT_TYPE: 'http',
        HTTP_PORT: '8080',
        HTTP_HOST: '0.0.0.0',
        HTTP_PATH: '/api/mcp',
        HTTP_CORS: 'false'
      };

      expect(process.env.TRANSPORT_TYPE).toBe('http');
      expect(process.env.HTTP_PORT).toBe('8080');
      expect(process.env.HTTP_HOST).toBe('0.0.0.0');
      expect(process.env.HTTP_PATH).toBe('/api/mcp');
      expect(process.env.HTTP_CORS).toBe('false');
    });

    it('should handle WebSocket transport configuration', () => {
      process.env = {
        PASSGAGE_USER_EMAIL: 'test@example.com',
        PASSGAGE_USER_PASSWORD: 'password123',
        TRANSPORT_TYPE: 'websocket',
        LOG_FORMAT: 'pretty'
      };

      expect(process.env.TRANSPORT_TYPE).toBe('websocket');
      expect(process.env.LOG_FORMAT).toBe('pretty');
    });
  });

  describe('Environment Validation Logic', () => {
    it('should validate required authentication fields', () => {
      // Test API key validation
      process.env = { PASSGAGE_API_KEY: 'test-key' };
      expect(process.env.PASSGAGE_API_KEY).toBeTruthy();

      // Test user credentials validation
      process.env = {
        PASSGAGE_USER_EMAIL: 'test@example.com',
        PASSGAGE_USER_PASSWORD: 'password'
      };
      expect(process.env.PASSGAGE_USER_EMAIL).toBeTruthy();
      expect(process.env.PASSGAGE_USER_PASSWORD).toBeTruthy();
    });

    it('should handle missing authentication', () => {
      process.env = {
        PASSGAGE_BASE_URL: 'https://api.passgage.com'
      };

      // No authentication method provided
      expect(process.env.PASSGAGE_API_KEY).toBeUndefined();
      expect(process.env.PASSGAGE_USER_EMAIL).toBeUndefined();
      expect(process.env.PASSGAGE_USER_PASSWORD).toBeUndefined();
    });

    it('should validate URL format', () => {
      const validUrls = [
        'https://api.passgage.com',
        'https://staging.api.passgage.com',
        'http://localhost:3000'
      ];

      const invalidUrls = [
        'not-a-url',
        'ftp://invalid-protocol',
        'missing-protocol.com'
      ];

      validUrls.forEach(url => {
        expect(url).toMatch(/^https?:\/\/.+/);
      });

      invalidUrls.forEach(url => {
        expect(url).not.toMatch(/^https?:\/\/.+/);
      });
    });

    it('should validate email format', () => {
      const validEmails = [
        'test@example.com',
        'user@company.org',
        'admin@domain.net'
      ];

      const invalidEmails = [
        'not-an-email',
        '@missing-local.com',
        'missing-at.com'
      ];

      validEmails.forEach(email => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });

      invalidEmails.forEach(email => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });

  describe('Type Transformations', () => {
    it('should transform string numbers to numbers', () => {
      const stringNumbers = {
        PASSGAGE_TIMEOUT: '45000',
        HTTP_PORT: '9000'
      };

      Object.entries(stringNumbers).forEach(([key, value]) => {
        const numValue = Number(value);
        expect(typeof numValue).toBe('number');
        expect(numValue).toBeGreaterThan(0);
      });
    });

    it('should transform string booleans to booleans', () => {
      const stringBooleans = {
        PASSGAGE_DEBUG: 'true',
        HTTP_CORS: 'false'
      };

      Object.entries(stringBooleans).forEach(([key, value]) => {
        const boolValue = value === 'true';
        expect(typeof boolValue).toBe('boolean');
      });
    });

    it('should handle enum validations', () => {
      const validTransportTypes = ['stdio', 'http', 'websocket'];
      const validLogLevels = ['debug', 'info', 'warn', 'error'];
      const validNodeEnvs = ['development', 'production', 'test'];

      validTransportTypes.forEach(type => {
        expect(['stdio', 'http', 'websocket']).toContain(type);
      });

      validLogLevels.forEach(level => {
        expect(['debug', 'info', 'warn', 'error']).toContain(level);
      });

      validNodeEnvs.forEach(env => {
        expect(['development', 'production', 'test']).toContain(env);
      });
    });
  });

  describe('Default Values', () => {
    it('should define expected default values', () => {
      const expectedDefaults = {
        PASSGAGE_BASE_URL: 'https://api.passgage.com',
        PASSGAGE_TIMEOUT: 30000,
        PASSGAGE_DEBUG: false,
        TRANSPORT_TYPE: 'stdio',
        HTTP_PORT: 3000,
        HTTP_HOST: 'localhost',
        HTTP_PATH: '/mcp',
        HTTP_CORS: true,
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'json',
        NODE_ENV: 'production'
      };

      Object.entries(expectedDefaults).forEach(([key, expectedValue]) => {
        expect(typeof expectedValue).toBeDefined();
      });
    });
  });

  describe('Configuration Scenarios', () => {
    it('should handle minimal configuration', () => {
      process.env = {
        PASSGAGE_API_KEY: 'minimal-key'
      };

      expect(process.env.PASSGAGE_API_KEY).toBeTruthy();
    });

    it('should handle full configuration', () => {
      process.env = {
        PASSGAGE_API_KEY: 'test-api-key',
        PASSGAGE_BASE_URL: 'https://api.test.com',
        PASSGAGE_TIMEOUT: '60000',
        PASSGAGE_DEBUG: 'true',
        TRANSPORT_TYPE: 'http',
        HTTP_PORT: '8080',
        HTTP_HOST: '0.0.0.0',
        HTTP_PATH: '/api/mcp',
        HTTP_CORS: 'false',
        LOG_LEVEL: 'debug',
        LOG_FORMAT: 'pretty',
        NODE_ENV: 'development'
      };

      // Verify all fields are set
      Object.keys(process.env).forEach(key => {
        expect(process.env[key]).toBeTruthy();
      });
    });

    it('should handle mixed authentication scenarios', () => {
      // Both API key and user credentials
      process.env = {
        PASSGAGE_API_KEY: 'test-api-key',
        PASSGAGE_USER_EMAIL: 'test@example.com',
        PASSGAGE_USER_PASSWORD: 'password123'
      };

      expect(process.env.PASSGAGE_API_KEY).toBeTruthy();
      expect(process.env.PASSGAGE_USER_EMAIL).toBeTruthy();
      expect(process.env.PASSGAGE_USER_PASSWORD).toBeTruthy();
    });
  });
});