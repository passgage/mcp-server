/**
 * Standard response format for all tools
 */
export interface ToolResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
  metadata?: ResponseMetadata;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  timestamp: string;
  duration?: number;
  pagination?: PaginationMetadata;
  warnings?: string[];
}

/**
 * Pagination metadata
 */
export interface PaginationMetadata {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  metadata?: Partial<ResponseMetadata>
): ToolResponse<T> {
  return {
    success: true,
    message,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string,
  code?: string,
  details?: any,
  metadata?: Partial<ResponseMetadata>
): ToolResponse {
  return {
    success: false,
    error,
    code,
    details,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  perPage: number,
  total: number,
  message?: string
): ToolResponse<T[]> {
  const totalPages = Math.ceil(total / perPage);
  
  return {
    success: true,
    message,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    }
  };
}

/**
 * Format API response to tool response
 */
export function formatApiResponse(response: any): ToolResponse {
  // Check if response already has our format
  if (response && typeof response === 'object' && 'success' in response) {
    return response;
  }

  // Handle paginated responses
  if (response && Array.isArray(response.data)) {
    const pagination = response.pagination || response.meta?.pagination;
    
    if (pagination) {
      return paginatedResponse(
        response.data,
        pagination.page || pagination.current_page || 1,
        pagination.per_page || pagination.limit || 25,
        pagination.total || response.data.length
      );
    }
  }

  // Handle single object responses
  if (response && response.data) {
    return successResponse(response.data);
  }

  // Direct response
  return successResponse(response);
}

/**
 * Extract pagination from headers or response
 */
export function extractPagination(headers: any, response: any): PaginationMetadata | undefined {
  // Try to get from headers
  if (headers) {
    const total = headers['x-total-count'] || headers['x-total'];
    const page = headers['x-page'] || headers['x-current-page'];
    const perPage = headers['x-per-page'] || headers['x-page-size'];
    
    if (total && page && perPage) {
      const totalPages = Math.ceil(parseInt(total) / parseInt(perPage));
      return {
        page: parseInt(page),
        per_page: parseInt(perPage),
        total: parseInt(total),
        total_pages: totalPages,
        has_next: parseInt(page) < totalPages,
        has_prev: parseInt(page) > 1
      };
    }
  }

  // Try to get from response body
  if (response) {
    const meta = response.meta || response.metadata || response.pagination;
    if (meta) {
      return {
        page: meta.page || meta.current_page || 1,
        per_page: meta.per_page || meta.page_size || 25,
        total: meta.total || meta.total_count || 0,
        total_pages: meta.total_pages || meta.pages || 1,
        has_next: meta.has_next || meta.next_page !== null,
        has_prev: meta.has_prev || meta.prev_page !== null
      };
    }
  }

  return undefined;
}

/**
 * Format duration in milliseconds to readable string
 */
export function formatDuration(startTime: number): string {
  const duration = Date.now() - startTime;
  
  if (duration < 1000) {
    return `${duration}ms`;
  }
  
  const seconds = (duration / 1000).toFixed(2);
  return `${seconds}s`;
}

/**
 * Sanitize response data (remove sensitive fields)
 */
export function sanitizeResponse(data: any, sensitiveFields: string[] = []): any {
  const defaultSensitiveFields = [
    'password',
    'token',
    'api_key',
    'apiKey',
    'secret',
    'authorization',
    'cookie'
  ];
  
  const fieldsToRemove = [...defaultSensitiveFields, ...sensitiveFields];
  
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item, sensitiveFields));
  }
  
  const sanitized = { ...data };
  
  for (const field of fieldsToRemove) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (value && typeof value === 'object') {
      sanitized[key] = sanitizeResponse(value, sensitiveFields);
    }
  }
  
  return sanitized;
}

/**
 * Alias for successResponse to match test expectations
 */
export const createSuccessResponse = successResponse;

/**
 * Create an error response
 */
export function createErrorResponse(
  error: string | Error,
  code?: string,
  details?: any,
  metadata?: Partial<ResponseMetadata>
): ToolResponse {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return {
    success: false,
    error: errorMessage,
    code,
    details,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}