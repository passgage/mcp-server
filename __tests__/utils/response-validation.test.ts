import {
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
  validateResponse,
  transformData,
  sanitizeOutput
} from '../../src/utils/response.js';

import {
  validateEmail,
  validateUUID,
  validateDate,
  validateRequired,
  createValidationSchema,
  validateAgainstSchema
} from '../../src/utils/validation.js';

describe('Response Utilities', () => {
  describe('createSuccessResponse', () => {
    it('should create basic success response', () => {
      const data = { id: 1, name: 'John' };
      const response = createSuccessResponse(data);
      
      expect(response).toEqual({
        success: true,
        data: { id: 1, name: 'John' },
        message: undefined,
        timestamp: expect.any(String)
      });
    });

    it('should create success response with message', () => {
      const data = { users: [] };
      const response = createSuccessResponse(data, 'Users retrieved successfully');
      
      expect(response).toEqual({
        success: true,
        data: { users: [] },
        message: 'Users retrieved successfully',
        timestamp: expect.any(String)
      });
    });

    it('should create success response with pagination', () => {
      const data = { users: [{ id: 1, name: 'John' }] };
      const pagination = {
        page: 1,
        per_page: 25,
        total: 1,
        total_pages: 1
      };
      const response = createSuccessResponse(data, 'Users found', pagination);
      
      expect(response).toEqual({
        success: true,
        data: { users: [{ id: 1, name: 'John' }] },
        message: 'Users found',
        pagination: {
          page: 1,
          per_page: 25,
          total: 1,
          total_pages: 1
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle null/undefined data', () => {
      const nullResponse = createSuccessResponse(null);
      const undefinedResponse = createSuccessResponse(undefined);
      
      expect(nullResponse.success).toBe(true);
      expect(nullResponse.data).toBe(null);
      expect(undefinedResponse.data).toBe(undefined);
    });
  });

  describe('createErrorResponse', () => {
    it('should create basic error response', () => {
      const response = createErrorResponse('Something went wrong');
      
      expect(response).toEqual({
        success: false,
        error: 'Something went wrong',
        message: 'Something went wrong',
        timestamp: expect.any(String)
      });
    });

    it('should create error response with details', () => {
      const details = {
        field: 'email',
        code: 'INVALID_FORMAT'
      };
      const response = createErrorResponse('Validation failed', 'Invalid email format', details);
      
      expect(response).toEqual({
        success: false,
        error: 'Validation failed',
        message: 'Invalid email format',
        details: {
          field: 'email',
          code: 'INVALID_FORMAT'
        },
        timestamp: expect.any(String)
      });
    });

    it('should create error response with error code', () => {
      const response = createErrorResponse('Access denied', undefined, undefined, 'FORBIDDEN');
      
      expect(response).toEqual({
        success: false,
        error: 'Access denied',
        message: 'Access denied',
        code: 'FORBIDDEN',
        timestamp: expect.any(String)
      });
    });
  });

  describe('formatResponse', () => {
    it('should format successful API response', () => {
      const apiResponse = {
        data: { id: 1, name: 'John' },
        status: 'success'
      };
      
      const formatted = formatResponse(apiResponse, true);
      
      expect(formatted.success).toBe(true);
      expect(formatted.data).toEqual({ id: 1, name: 'John' });
      expect(formatted.timestamp).toBeDefined();
    });

    it('should format error API response', () => {
      const apiResponse = {
        error: 'Not found',
        message: 'User not found'
      };
      
      const formatted = formatResponse(apiResponse, false);
      
      expect(formatted.success).toBe(false);
      expect(formatted.error).toBe('Not found');
      expect(formatted.message).toBe('User not found');
    });

    it('should handle response transformation', () => {
      const apiResponse = {
        user_data: { user_id: 1, user_name: 'John' }
      };
      
      const transformer = (data: any) => ({
        id: data.user_data.user_id,
        name: data.user_data.user_name
      });
      
      const formatted = formatResponse(apiResponse, true, transformer);
      
      expect(formatted.data).toEqual({ id: 1, name: 'John' });
    });
  });

  describe('validateResponse', () => {
    it('should validate correct response structure', () => {
      const response = {
        success: true,
        data: { id: 1, name: 'John' },
        timestamp: new Date().toISOString()
      };
      
      const result = validateResponse(response);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const response = {
        data: { id: 1, name: 'John' }
        // Missing success and timestamp
      };
      
      const result = validateResponse(response);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: success');
      expect(result.errors).toContain('Missing required field: timestamp');
    });

    it('should validate error response structure', () => {
      const response = {
        success: false,
        error: 'Something went wrong',
        timestamp: new Date().toISOString()
      };
      
      const result = validateResponse(response);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid field types', () => {
      const response = {
        success: 'true', // Should be boolean
        data: { id: 1, name: 'John' },
        timestamp: Date.now() // Should be string
      };
      
      const result = validateResponse(response);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('success must be boolean'))).toBe(true);
      expect(result.errors.some(error => error.includes('timestamp must be string'))).toBe(true);
    });
  });

  describe('transformData', () => {
    it('should transform snake_case to camelCase', () => {
      const snakeData = {
        user_id: 1,
        first_name: 'John',
        last_name: 'Doe',
        created_at: '2024-01-01',
        profile_data: {
          phone_number: '123-456-7890',
          address_line: '123 Main St'
        }
      };
      
      const camelData = transformData(snakeData, 'camelCase');
      
      expect(camelData).toEqual({
        userId: 1,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: '2024-01-01',
        profileData: {
          phoneNumber: '123-456-7890',
          addressLine: '123 Main St'
        }
      });
    });

    it('should transform camelCase to snake_case', () => {
      const camelData = {
        userId: 1,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: '2024-01-01'
      };
      
      const snakeData = transformData(camelData, 'snake_case');
      
      expect(snakeData).toEqual({
        user_id: 1,
        first_name: 'John',
        last_name: 'Doe',
        created_at: '2024-01-01'
      });
    });

    it('should handle arrays of objects', () => {
      const data = {
        user_list: [
          { user_id: 1, user_name: 'John' },
          { user_id: 2, user_name: 'Jane' }
        ]
      };
      
      const transformed = transformData(data, 'camelCase');
      
      expect(transformed).toEqual({
        userList: [
          { userId: 1, userName: 'John' },
          { userId: 2, userName: 'Jane' }
        ]
      });
    });

    it('should preserve non-object values', () => {
      const data = {
        simple_string: 'test',
        simple_number: 42,
        simple_boolean: true,
        simple_null: null,
        simple_array: [1, 2, 3]
      };
      
      const transformed = transformData(data, 'camelCase');
      
      expect(transformed).toEqual({
        simpleString: 'test',
        simpleNumber: 42,
        simpleBoolean: true,
        simpleNull: null,
        simpleArray: [1, 2, 3]
      });
    });
  });

  describe('sanitizeOutput', () => {
    it('should remove sensitive fields', () => {
      const data = {
        id: 1,
        name: 'John',
        password: 'secret123',
        api_key: 'api-key-123',
        token: 'jwt-token-123',
        secret: 'top-secret',
        internal_notes: 'internal info'
      };
      
      const sanitized = sanitizeOutput(data);
      
      expect(sanitized).toEqual({
        id: 1,
        name: 'John',
        internal_notes: 'internal info'
      });
      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('api_key');
      expect(sanitized).not.toHaveProperty('token');
      expect(sanitized).not.toHaveProperty('secret');
    });

    it('should sanitize nested objects', () => {
      const data = {
        user: {
          id: 1,
          name: 'John',
          password: 'secret123'
        },
        settings: {
          theme: 'dark',
          api_key: 'api-key-123'
        }
      };
      
      const sanitized = sanitizeOutput(data);
      
      expect(sanitized.user).toEqual({ id: 1, name: 'John' });
      expect(sanitized.settings).toEqual({ theme: 'dark' });
    });

    it('should sanitize arrays of objects', () => {
      const data = {
        users: [
          { id: 1, name: 'John', password: 'secret1' },
          { id: 2, name: 'Jane', password: 'secret2' }
        ]
      };
      
      const sanitized = sanitizeOutput(data);
      
      expect(sanitized.users).toEqual([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ]);
    });

    it('should preserve non-sensitive data', () => {
      const data = {
        id: 1,
        name: 'John',
        email: 'john@example.com',
        created_at: '2024-01-01',
        profile: {
          bio: 'Software developer',
          location: 'New York'
        }
      };
      
      const sanitized = sanitizeOutput(data);
      
      expect(sanitized).toEqual(data);
    });

    it('should handle custom sensitive fields', () => {
      const data = {
        id: 1,
        name: 'John',
        social_security: '123-45-6789',
        credit_card: '4111-1111-1111-1111'
      };
      
      const customSensitiveFields = ['social_security', 'credit_card'];
      const sanitized = sanitizeOutput(data, customSensitiveFields);
      
      expect(sanitized).toEqual({ id: 1, name: 'John' });
    });
  });
});

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user+tag@domain.co.uk',
        'firstname.lastname@company.com',
        'user123@test-domain.org'
      ];
      
      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        'user@',
        '@domain.com',
        'user..double@domain.com',
        'user@domain',
        'user space@domain.com'
      ];
      
      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
    });
  });

  describe('validateUUID', () => {
    it('should validate correct UUID formats', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
      ];
      
      validUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-42661417400g', // Invalid character
        '123e4567e89b12d3a456426614174000', // Missing dashes
        ''
      ];
      
      invalidUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(false);
      });
    });
  });

  describe('validateDate', () => {
    it('should validate correct date formats', () => {
      const validDates = [
        '2024-01-01',
        '2024-12-31',
        '2024-02-29', // Leap year
        '2000-01-01'
      ];
      
      validDates.forEach(date => {
        expect(validateDate(date)).toBe(true);
      });
    });

    it('should reject invalid date formats', () => {
      const invalidDates = [
        '2024-13-01', // Invalid month
        '2024-02-30', // Invalid day for February
        '2023-02-29', // Not a leap year
        '01-01-2024', // Wrong format
        '2024/01/01', // Wrong separator
        'not-a-date'
      ];
      
      invalidDates.forEach(date => {
        expect(validateDate(date)).toBe(false);
      });
    });

    it('should validate ISO datetime strings', () => {
      const validDateTimes = [
        '2024-01-01T00:00:00Z',
        '2024-12-31T23:59:59.999Z',
        '2024-06-15T12:30:45.123Z'
      ];
      
      validDateTimes.forEach(dateTime => {
        expect(validateDate(dateTime, 'iso')).toBe(true);
      });
    });
  });

  describe('validateRequired', () => {
    it('should validate required values', () => {
      expect(validateRequired('string')).toBe(true);
      expect(validateRequired(123)).toBe(true);
      expect(validateRequired(true)).toBe(true);
      expect(validateRequired(false)).toBe(true);
      expect(validateRequired(0)).toBe(true);
      expect(validateRequired([])).toBe(true);
      expect(validateRequired({})).toBe(true);
    });

    it('should reject empty values', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired(null)).toBe(false);
      expect(validateRequired(undefined)).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(validateRequired('   ')).toBe(false); // Only whitespace
      expect(validateRequired(' test ')).toBe(true); // Contains content
    });
  });

  describe('createValidationSchema', () => {
    it('should create validation schema with rules', () => {
      const schema = createValidationSchema({
        email: ['required', 'email'],
        age: ['required', 'number', 'min:18'],
        name: ['required', 'string', 'max:100']
      });
      
      expect(schema).toHaveProperty('email');
      expect(schema).toHaveProperty('age');
      expect(schema).toHaveProperty('name');
      
      expect(schema.email).toContain('required');
      expect(schema.email).toContain('email');
    });

    it('should handle conditional rules', () => {
      const schema = createValidationSchema({
        password: ['required', 'min:8'],
        confirmPassword: ['required', 'same:password']
      });
      
      expect(schema.confirmPassword).toContain('same:password');
    });
  });

  describe('validateAgainstSchema', () => {
    it('should validate data against schema successfully', () => {
      const schema = {
        email: ['required', 'email'],
        age: ['required', 'number', 'min:18']
      };
      
      const validData = {
        email: 'test@example.com',
        age: 25
      };
      
      const result = validateAgainstSchema(validData, schema);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation failures', () => {
      const schema = {
        email: ['required', 'email'],
        age: ['required', 'number', 'min:18']
      };
      
      const invalidData = {
        email: 'invalid-email',
        age: 16
      };
      
      const result = validateAgainstSchema(invalidData, schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.field === 'email')).toBe(true);
      expect(result.errors.some(error => error.field === 'age')).toBe(true);
    });

    it('should detect missing required fields', () => {
      const schema = {
        name: ['required'],
        email: ['required', 'email']
      };
      
      const incompleteData = {
        name: 'John'
        // Missing email
      };
      
      const result = validateAgainstSchema(incompleteData, schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.field === 'email' && error.rule === 'required'
      )).toBe(true);
    });

    it('should handle nested object validation', () => {
      const schema = {
        'user.name': ['required', 'string'],
        'user.email': ['required', 'email'],
        'settings.theme': ['required', 'in:light,dark']
      };
      
      const data = {
        user: {
          name: 'John',
          email: 'john@example.com'
        },
        settings: {
          theme: 'light'
        }
      };
      
      const result = validateAgainstSchema(data, schema);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate array elements', () => {
      const schema = {
        'tags.*': ['required', 'string', 'max:20'],
        'users.*.email': ['required', 'email']
      };
      
      const data = {
        tags: ['web', 'development', 'javascript'],
        users: [
          { email: 'user1@example.com' },
          { email: 'user2@example.com' }
        ]
      };
      
      const result = validateAgainstSchema(data, schema);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Performance Tests', () => {
    it('should validate large datasets efficiently', () => {
      const largeData = {};
      const schema = {};
      
      // Create large dataset
      for (let i = 0; i < 1000; i++) {
        (largeData as any)[`field_${i}`] = `value_${i}`;
        (schema as any)[`field_${i}`] = ['required', 'string'];
      }
      
      const startTime = Date.now();
      const result = validateAgainstSchema(largeData, schema);
      const endTime = Date.now();
      
      expect(result.valid).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in <1s
    });
  });
});