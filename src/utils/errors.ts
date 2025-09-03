import { logger } from '../config/logger.js';

/**
 * Base error class for all custom errors
 */
export class PassgageError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, detailsOrStatusCode?: any | number, details?: any) {
    super(message);
    this.name = 'PassgageError';
    this.code = code;
    
    // Handle constructor overloading - if third parameter is a number, it's statusCode
    if (typeof detailsOrStatusCode === 'number') {
      this.statusCode = detailsOrStatusCode;
      this.details = details;
    } else {
      // Third parameter is details, statusCode defaults to 500
      this.statusCode = 500;
      this.details = detailsOrStatusCode;
    }
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    // Handle circular references safely without parsing/re-stringifying
    const seen = new WeakSet();
    const safeCopyDetails = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      
      if (seen.has(obj)) {
        return '[Circular]';
      }
      
      seen.add(obj);
      
      if (Array.isArray(obj)) {
        return obj.map(item => safeCopyDetails(item));
      }
      
      const copy: any = {};
      for (const [key, value] of Object.entries(obj)) {
        copy[key] = safeCopyDetails(value);
      }
      
      return copy;
    };

    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details ? safeCopyDetails(this.details) : this.details
    };
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends PassgageError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends PassgageError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends PassgageError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends PassgageError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND_ERROR', 404, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends PassgageError {
  constructor(message: string, details?: any) {
    super(message, 'RATE_LIMIT_ERROR', 429, details);
    this.name = 'RateLimitError';
  }
}

/**
 * Server error (5xx)
 */
export class ServerError extends PassgageError {
  constructor(message: string, details?: any) {
    super(message, 'SERVER_ERROR', 500, details);
    this.name = 'ServerError';
  }
}

/**
 * Network error
 */
export class NetworkError extends PassgageError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', 503, details);
    this.name = 'NetworkError';
  }
}

/**
 * API error mapper - converts API errors to our error types
 */
export function mapApiError(error: any): PassgageError {
  // Log the original error
  logger.debug('Mapping API error:', error);

  // Handle Axios errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    const message = data?.message || data?.error || error.message;

    switch (status) {
      case 401:
        return new AuthenticationError(message, data);
      case 403:
        return new AuthorizationError(message, data);
      case 404:
        return new NotFoundError(message, data);
      case 429:
        return new RateLimitError(message, data);
      case 400:
      case 422:
        return new ValidationError(message, data);
      default:
        return new PassgageError(message, 'API_ERROR', status, data);
    }
  }

  // Handle network errors
  if (error.code === 'ECONNREFUSED') {
    return new PassgageError('Unable to connect to Passgage API', 'CONNECTION_ERROR', 503, {
      originalError: error.message
    });
  }

  if (error.code === 'ETIMEDOUT') {
    return new PassgageError('Request timeout', 'TIMEOUT_ERROR', 504, {
      originalError: error.message
    });
  }

  // Default error
  return new PassgageError(
    error.message || 'An unexpected error occurred',
    'UNKNOWN_ERROR',
    500,
    { originalError: error }
  );
}

/**
 * Create error from HTTP response
 */
export function createErrorFromResponse(statusCode: number, responseData: any): PassgageError {
  const message = responseData?.message || 'API request failed';
  
  switch (statusCode) {
    case 400:
      return new ValidationError(message, responseData?.errors);
    case 401:
      return new AuthenticationError(message, responseData);
    case 403:
      return new AuthorizationError(message, responseData);
    case 404:
      return new NotFoundError(message, responseData);
    case 429:
      return new RateLimitError(message, {
        retryAfter: responseData?.retry_after,
        limit: responseData?.limit
      });
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(message, responseData);
    default:
      return new PassgageError(message, 'UNKNOWN_ERROR', statusCode, responseData);
  }
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: PassgageError | Error): string {
  if (!(error instanceof PassgageError)) {
    return error.message;
  }

  let message = error.message;
  
  if (error instanceof ValidationError && error.details && Array.isArray(error.details)) {
    message += '\nValidation errors:';
    for (const detail of error.details) {
      if (detail.field_name && detail.messages) {
        const messages = Array.isArray(detail.messages) ? detail.messages.join(', ') : detail.messages;
        message += `\n  ${detail.field_name}: ${messages}`;
      }
    }
  } else if (error.details && typeof error.details === 'object') {
    message += `\nDetails: ${JSON.stringify(error.details, null, 2)}`;
  }
  
  return message;
}

/**
 * Get error type string
 */
export function getErrorType(error: any): string {
  if (error instanceof ValidationError) return 'validation';
  if (error instanceof AuthenticationError) return 'authentication';
  if (error instanceof AuthorizationError) return 'authorization';
  if (error instanceof NotFoundError) return 'not_found';
  if (error instanceof RateLimitError) return 'rate_limit';
  if (error instanceof ServerError) return 'server';
  if (error instanceof NetworkError) return 'network';
  if (error instanceof PassgageError) return 'general';
  return 'unknown';
}

/**
 * Error handler for MCP tool responses
 */
export function formatToolError(error: any): any {
  if (error instanceof PassgageError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    };
  }

  const mappedError = mapApiError(error);
  return {
    success: false,
    error: mappedError.message,
    code: mappedError.code,
    details: mappedError.details
  };
}