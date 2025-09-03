import { z } from 'zod';
import { ValidationError } from './errors.js';

/**
 * Validate input against a Zod schema
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  errorMessage?: string
): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(errorMessage || `Validation failed: ${issues}`, {
        errors: error.errors
      });
    }
    throw error;
  }
}

/**
 * Safe parse with error details
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; error: string; details: any } {
  const result = schema.safeParse(input);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const issues = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  return {
    success: false,
    error: `Validation failed: ${issues}`,
    details: result.error.errors
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.number().int().positive().default(1),
    per_page: z.number().int().min(1).max(100).default(25)
  }),

  // ID parameter
  id: z.object({
    id: z.union([z.string().uuid(), z.number().int().positive()])
  }),

  // Date range
  dateRange: z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional()
  }),

  // Sort parameters
  sort: z.object({
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional()
  }),

  // Search query
  search: z.object({
    q: z.string().optional(),
    fields: z.array(z.string()).optional()
  })
};

/**
 * Transform empty strings to undefined
 */
export function emptyToUndefined(value: any): any {
  if (value === '') return undefined;
  if (value === null) return undefined;
  return value;
}

/**
 * Transform string boolean to boolean
 */
export function stringToBoolean(value: any): boolean | undefined {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
}

/**
 * Validate and transform query parameters
 */
export function validateQueryParams(params: any): any {
  const cleaned: any = {};
  
  for (const [key, value] of Object.entries(params)) {
    // Skip undefined/null values
    if (value === undefined || value === null) continue;
    
    // Transform empty strings
    if (value === '') continue;
    
    // Handle arrays
    if (Array.isArray(value)) {
      const filtered = value.filter(v => v !== '' && v !== undefined && v !== null);
      if (filtered.length > 0) {
        cleaned[key] = filtered;
      }
      continue;
    }
    
    // Handle objects (nested query params)
    if (typeof value === 'object') {
      const nested = validateQueryParams(value);
      if (Object.keys(nested).length > 0) {
        cleaned[key] = nested;
      }
      continue;
    }
    
    // Add valid value
    cleaned[key] = value;
  }
  
  return cleaned;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate date string
 */
export function validateDate(date: string): boolean {
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime()) && parsedDate.toISOString() === date;
}

/**
 * Validate required field
 */
export function validateRequired(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Create validation schema from rules object
 */
export function createValidationSchema(rules: Record<string, string[]>): Record<string, string[]> {
  return { ...rules };
}

/**
 * Validate data against validation schema
 */
export function validateAgainstSchema(
  data: any, 
  schema: Record<string, string[]>
): { valid: boolean; errors: Array<{ field: string; rule: string; message: string }> } {
  const errors: Array<{ field: string; rule: string; message: string }> = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    for (const rule of rules) {
      let isValid = true;
      let message = '';

      if (rule === 'required') {
        isValid = validateRequired(value);
        message = `${field} is required`;
      } else if (rule === 'email') {
        if (value !== undefined && value !== null && value !== '') {
          isValid = validateEmail(value);
          message = `${field} must be a valid email`;
        }
      } else if (rule === 'number') {
        if (value !== undefined && value !== null && value !== '') {
          isValid = !isNaN(Number(value));
          message = `${field} must be a number`;
        }
      } else if (rule === 'string') {
        if (value !== undefined && value !== null) {
          isValid = typeof value === 'string';
          message = `${field} must be a string`;
        }
      } else if (rule.startsWith('min:')) {
        const min = parseInt(rule.split(':')[1]);
        if (typeof value === 'number') {
          isValid = value >= min;
          message = `${field} must be at least ${min}`;
        } else if (typeof value === 'string') {
          isValid = value.length >= min;
          message = `${field} must be at least ${min} characters`;
        }
      } else if (rule.startsWith('max:')) {
        const max = parseInt(rule.split(':')[1]);
        if (typeof value === 'number') {
          isValid = value <= max;
          message = `${field} must be at most ${max}`;
        } else if (typeof value === 'string') {
          isValid = value.length <= max;
          message = `${field} must be at most ${max} characters`;
        }
      } else if (rule.startsWith('same:')) {
        const otherField = rule.split(':')[1];
        isValid = value === data[otherField];
        message = `${field} must match ${otherField}`;
      }

      if (!isValid) {
        errors.push({ field, rule, message });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate Ransack query parameters
 */
export function validateRansackQuery(query: any): any {
  const ransackOperators = [
    '_eq', '_not_eq', '_matches', '_does_not_match',
    '_cont', '_not_cont', '_start', '_not_start',
    '_end', '_not_end', '_true', '_false',
    '_present', '_blank', '_null', '_not_null',
    '_in', '_not_in', '_lt', '_lteq',
    '_gt', '_gteq', '_cont_any', '_cont_all',
    '_not_cont_any', '_not_cont_all', '_start_any',
    '_start_all', '_not_start_any', '_not_start_all',
    '_end_any', '_end_all', '_not_end_any', '_not_end_all'
  ];

  const validated: any = {};
  
  for (const [key, value] of Object.entries(query)) {
    // Check if key contains a valid Ransack operator
    const hasOperator = ransackOperators.some(op => key.includes(op));
    
    if (hasOperator) {
      validated[key] = value;
    } else {
      // If no operator, assume _eq
      validated[`${key}_eq`] = value;
    }
  }
  
  return validated;
}