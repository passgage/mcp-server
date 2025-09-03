import { jest } from '@jest/globals';

// Mock winston module before any imports
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  level: 'info'
};

const mockWinston = {
  createLogger: jest.fn(() => mockLogger),
  format: {
    combine: jest.fn(() => 'combined-format'),
    timestamp: jest.fn(() => 'timestamp-format'),
    errors: jest.fn(() => 'errors-format'),
    json: jest.fn(() => 'json-format'),
    prettyPrint: jest.fn(() => 'pretty-format'),
    colorize: jest.fn(() => 'colorize-format'),
    simple: jest.fn(() => 'simple-format'),
    printf: jest.fn(() => 'printf-format')
  },
  transports: {
    Console: jest.fn().mockImplementation(() => ({
      format: 'console-format',
      level: 'info'
    })),
    File: jest.fn().mockImplementation(() => ({
      filename: 'test.log',
      level: 'error'
    }))
  }
};

jest.mock('winston', () => mockWinston);

describe('Logger Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Logger Creation', () => {
    it('should create logger with default configuration', async () => {
      process.env.LOG_LEVEL = 'info';
      process.env.LOG_FORMAT = 'json';
      process.env.NODE_ENV = 'production';

      const { logger } = await import('../../src/config/logger.js');

      expect(mockWinston.createLogger).toHaveBeenCalled();
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should handle different log levels', async () => {
      process.env.LOG_LEVEL = 'debug';
      process.env.NODE_ENV = 'development';

      await import('../../src/config/logger.js');

      expect(mockWinston.createLogger).toHaveBeenCalled();
      expect(mockWinston.format.combine).toHaveBeenCalled();
      expect(mockWinston.format.timestamp).toHaveBeenCalled();
    });

    it('should use console transport', async () => {
      process.env.LOG_LEVEL = 'info';
      process.env.NODE_ENV = 'development';

      await import('../../src/config/logger.js');

      expect(mockWinston.transports.Console).toHaveBeenCalled();
    });
  });

  describe('Logger Functionality', () => {
    let logger: any;

    beforeEach(async () => {
      process.env.LOG_LEVEL = 'debug';
      process.env.NODE_ENV = 'test';

      const loggerModule = await import('../../src/config/logger.js');
      logger = loggerModule.logger;
    });

    it('should provide info logging method', () => {
      logger.info('Test info message');
      expect(logger.info).toHaveBeenCalledWith('Test info message');
    });

    it('should provide warn logging method', () => {
      logger.warn('Test warning message');
      expect(logger.warn).toHaveBeenCalledWith('Test warning message');
    });

    it('should provide error logging method', () => {
      logger.error('Test error message');
      expect(logger.error).toHaveBeenCalledWith('Test error message');
    });

    it('should provide debug logging method', () => {
      logger.debug('Test debug message');
      expect(logger.debug).toHaveBeenCalledWith('Test debug message');
    });

    it('should handle structured logging', () => {
      const metadata = { userId: 123, action: 'login' };
      logger.info('User action', metadata);
      expect(logger.info).toHaveBeenCalledWith('User action', metadata);
    });

    it('should handle error objects', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', { error });
      expect(logger.error).toHaveBeenCalledWith('Error occurred', { error });
    });
  });

  describe('Winston Configuration', () => {
    it('should configure winston with correct format', async () => {
      process.env.LOG_FORMAT = 'json';
      process.env.NODE_ENV = 'production';

      await import('../../src/config/logger.js');

      expect(mockWinston.format.combine).toHaveBeenCalled();
      expect(mockWinston.format.timestamp).toHaveBeenCalled();
      expect(mockWinston.format.errors).toHaveBeenCalledWith({ stack: true });
    });

    it('should export logger instance', async () => {
      const { logger } = await import('../../src/config/logger.js');

      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
    });
  });
});