import {
  PassgageError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  NetworkError,
  createErrorFromResponse,
  formatErrorMessage,
  getErrorType
} from '../../src/utils/errors.js';

describe('Error Handling System', () => {
  describe('PassgageError Base Class', () => {
    it('should create basic error with message', () => {
      const error = new PassgageError('Test error message');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PassgageError);
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('PassgageError');
      expect(error.code).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it('should create error with code and details', () => {
      const details = { field: 'email', value: 'invalid' };
      const error = new PassgageError('Validation failed', 'VALIDATION_ERROR', details);
      
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(details);
    });

    it('should preserve stack trace', () => {
      const error = new PassgageError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('PassgageError');
    });
  });

  describe('Specific Error Classes', () => {
    it('should create ValidationError correctly', () => {
      const details = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'age', message: 'Must be a positive number' }
      ];
      const error = new ValidationError('Validation failed', details);
      
      expect(error).toBeInstanceOf(PassgageError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(details);
    });

    it('should create AuthenticationError correctly', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      expect(error).toBeInstanceOf(PassgageError);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.name).toBe('AuthenticationError');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.message).toBe('Invalid credentials');
    });

    it('should create AuthorizationError correctly', () => {
      const error = new AuthorizationError('Access denied', { requiredPermission: 'admin' });
      
      expect(error).toBeInstanceOf(PassgageError);
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.name).toBe('AuthorizationError');
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.details).toEqual({ requiredPermission: 'admin' });
    });

    it('should create NotFoundError correctly', () => {
      const error = new NotFoundError('User not found', { userId: '123' });
      
      expect(error).toBeInstanceOf(PassgageError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.name).toBe('NotFoundError');
      expect(error.code).toBe('NOT_FOUND_ERROR');
    });

    it('should create RateLimitError correctly', () => {
      const details = {
        limit: 100,
        remaining: 0,
        resetTime: new Date().toISOString()
      };
      const error = new RateLimitError('Rate limit exceeded', details);
      
      expect(error).toBeInstanceOf(PassgageError);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.name).toBe('RateLimitError');
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.details).toEqual(details);
    });

    it('should create ServerError correctly', () => {
      const error = new ServerError('Internal server error');
      
      expect(error).toBeInstanceOf(PassgageError);
      expect(error).toBeInstanceOf(ServerError);
      expect(error.name).toBe('ServerError');
      expect(error.code).toBe('SERVER_ERROR');
    });

    it('should create NetworkError correctly', () => {
      const error = new NetworkError('Connection timeout', { timeout: 30000 });
      
      expect(error).toBeInstanceOf(PassgageError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
    });
  });

  describe('createErrorFromResponse', () => {
    it('should create ValidationError from 400 response', () => {
      const responseData = {
        message: 'Validation failed',
        errors: [
          { field_name: 'email', messages: ['Invalid format'] },
          { field_name: 'age', messages: ['Must be positive', 'Required'] }
        ]
      };
      
      const error = createErrorFromResponse(400, responseData);
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual(responseData.errors);
    });

    it('should create AuthenticationError from 401 response', () => {
      const responseData = { message: 'Unauthorized' };
      const error = createErrorFromResponse(401, responseData);
      
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('Unauthorized');
    });

    it('should create AuthorizationError from 403 response', () => {
      const responseData = { message: 'Forbidden' };
      const error = createErrorFromResponse(403, responseData);
      
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.message).toBe('Forbidden');
    });

    it('should create NotFoundError from 404 response', () => {
      const responseData = { message: 'Resource not found' };
      const error = createErrorFromResponse(404, responseData);
      
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Resource not found');
    });

    it('should create RateLimitError from 429 response', () => {
      const responseData = {
        message: 'Too many requests',
        retry_after: 60,
        limit: 100
      };
      const error = createErrorFromResponse(429, responseData);
      
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.message).toBe('Too many requests');
      expect(error.details).toEqual({
        retryAfter: 60,
        limit: 100
      });
    });

    it('should create ServerError from 5xx responses', () => {
      const responseData = { message: 'Internal server error' };
      
      [500, 502, 503, 504].forEach(statusCode => {
        const error = createErrorFromResponse(statusCode, responseData);
        expect(error).toBeInstanceOf(ServerError);
        expect(error.message).toBe('Internal server error');
      });
    });

    it('should create generic PassgageError for unknown status codes', () => {
      const responseData = { message: 'Unknown error' };
      const error = createErrorFromResponse(418, responseData);
      
      expect(error).toBeInstanceOf(PassgageError);
      expect(error.message).toBe('Unknown error');
      expect(error.code).toBe('UNKNOWN_ERROR');
    });

    it('should handle missing message in response', () => {
      const responseData = { error: 'Something went wrong' };
      const error = createErrorFromResponse(400, responseData);
      
      expect(error.message).toBe('API request failed');
    });

    it('should handle empty response data', () => {
      const error = createErrorFromResponse(500, null);
      
      expect(error).toBeInstanceOf(ServerError);
      expect(error.message).toBe('API request failed');
    });
  });

  describe('formatErrorMessage', () => {
    it('should format simple error message', () => {
      const error = new PassgageError('Simple error');
      const formatted = formatErrorMessage(error);
      
      expect(formatted).toBe('Simple error');
    });

    it('should format validation error with details', () => {
      const details = [
        { field_name: 'email', messages: ['Invalid format'] },
        { field_name: 'age', messages: ['Must be positive'] }
      ];
      const error = new ValidationError('Validation failed', details);
      const formatted = formatErrorMessage(error);
      
      expect(formatted).toContain('Validation failed');
      expect(formatted).toContain('email: Invalid format');
      expect(formatted).toContain('age: Must be positive');
    });

    it('should format error with multiple field messages', () => {
      const details = [
        { field_name: 'password', messages: ['Too short', 'Must contain numbers', 'Must contain symbols'] }
      ];
      const error = new ValidationError('Password validation failed', details);
      const formatted = formatErrorMessage(error);
      
      expect(formatted).toContain('password: Too short, Must contain numbers, Must contain symbols');
    });

    it('should handle error without details', () => {
      const error = new AuthenticationError('Unauthorized');
      const formatted = formatErrorMessage(error);
      
      expect(formatted).toBe('Unauthorized');
    });

    it('should handle rate limit error with details', () => {
      const details = {
        limit: 100,
        remaining: 0,
        resetTime: '2024-01-01T12:00:00Z'
      };
      const error = new RateLimitError('Rate limit exceeded', details);
      const formatted = formatErrorMessage(error);
      
      expect(formatted).toContain('Rate limit exceeded');
      expect(formatted).toContain('Details:');
      expect(formatted).toContain(JSON.stringify(details, null, 2));
    });
  });

  describe('getErrorType', () => {
    it('should return correct type for each error class', () => {
      expect(getErrorType(new ValidationError('test'))).toBe('validation');
      expect(getErrorType(new AuthenticationError('test'))).toBe('authentication');
      expect(getErrorType(new AuthorizationError('test'))).toBe('authorization');
      expect(getErrorType(new NotFoundError('test'))).toBe('not_found');
      expect(getErrorType(new RateLimitError('test'))).toBe('rate_limit');
      expect(getErrorType(new ServerError('test'))).toBe('server');
      expect(getErrorType(new NetworkError('test'))).toBe('network');
      expect(getErrorType(new PassgageError('test'))).toBe('general');
    });

    it('should handle non-Passgage errors', () => {
      const standardError = new Error('Standard error');
      expect(getErrorType(standardError)).toBe('unknown');
    });

    it('should handle null/undefined', () => {
      expect(getErrorType(null as any)).toBe('unknown');
      expect(getErrorType(undefined as any)).toBe('unknown');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize errors to JSON correctly', () => {
      const details = { field: 'email', value: 'invalid' };
      const error = new ValidationError('Validation failed', [
        { field_name: 'email', messages: ['Invalid format'] }
      ]);
      
      const serialized = JSON.parse(JSON.stringify(error));
      
      expect(serialized.message).toBe('Validation failed');
      expect(serialized.name).toBe('ValidationError');
      expect(serialized.code).toBe('VALIDATION_ERROR');
    });

    it('should handle circular references in details', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      const error = new PassgageError('Test error', 'TEST_ERROR', circular);
      
      // Should not throw when stringifying
      expect(() => {
        JSON.stringify(error);
      }).not.toThrow();
    });
  });

  describe('Error Chaining', () => {
    it('should preserve original error as cause', () => {
      const originalError = new Error('Original error');
      const wrappedError = new PassgageError('Wrapped error');
      
      // Simulate error chaining
      (wrappedError as any).cause = originalError;
      
      expect((wrappedError as any).cause).toBe(originalError);
    });

    it('should handle nested error information', () => {
      const networkError = new NetworkError('Connection failed');
      const apiError = new ServerError('API unavailable', networkError);
      
      expect(apiError.message).toBe('API unavailable');
      expect(apiError.details).toBe(networkError);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should provide retry information for rate limit errors', () => {
      const error = new RateLimitError('Rate limit exceeded', {
        retryAfter: 60,
        limit: 100,
        remaining: 0
      });
      
      expect(error.details.retryAfter).toBe(60);
      expect(error.details.limit).toBe(100);
      expect(error.details.remaining).toBe(0);
    });

    it('should provide context for authorization errors', () => {
      const error = new AuthorizationError('Access denied', {
        requiredPermission: 'admin',
        userPermissions: ['read', 'write'],
        resourceId: 'user:123'
      });
      
      expect(error.details.requiredPermission).toBe('admin');
      expect(error.details.userPermissions).toEqual(['read', 'write']);
      expect(error.details.resourceId).toBe('user:123');
    });
  });

  describe('Performance', () => {
    it('should create errors efficiently', () => {
      const startTime = Date.now();
      
      // Create 1000 errors
      for (let i = 0; i < 1000; i++) {
        new PassgageError(`Error ${i}`);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
    });

    it('should format complex errors efficiently', () => {
      const details = [];
      for (let i = 0; i < 50; i++) {
        details.push({
          field_name: `field_${i}`,
          messages: [`Error message ${i}`, `Additional message ${i}`]
        });
      }
      
      const error = new ValidationError('Complex validation error', details);
      
      const startTime = Date.now();
      formatErrorMessage(error);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should complete in <50ms
    });
  });
});