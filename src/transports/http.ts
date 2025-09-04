import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage, JSONRPCResponse } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../config/logger.js';
import { sessionManager, SessionManager } from '../utils/session.js';
import { SecurityManager } from '../utils/security.js';
// Removed unused crypto imports

export interface HttpTransportOptions {
  type: 'http' | 'websocket' | 'cloudflare';
  port?: number;
  host?: string;
  path?: string;
  cors?: boolean;
  auth?: {
    type: 'session' | 'bearer' | 'oauth2';
    config?: any;
  };
  sessionManager?: SessionManager;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface SessionContext {
  sessionId?: string;
  userId?: string;
  authMode: 'user' | 'company' | 'none';
  isAuthenticated: boolean;
}

/**
 * Session-aware HTTP transport for multi-user global MCP server deployment
 * Supports Cloudflare Workers, traditional HTTP servers, and WebSocket
 */
export class HttpTransport implements Transport {
  private options: HttpTransportOptions;
  private messageHandlers = new Set<(message: JSONRPCMessage) => void>();
  private closeHandlers = new Set<() => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  private sessionManager: SessionManager;
  private securityManager: SecurityManager;
  private currentSessionContext?: SessionContext;

  constructor(options: HttpTransportOptions) {
    this.options = {
      port: 3000,
      host: 'localhost',
      path: '/mcp',
      cors: true,
      auth: { type: 'session' },
      rateLimit: {
        windowMs: 60000, // 1 minute
        maxRequests: 100
      },
      ...options
    };
    
    this.sessionManager = options.sessionManager || sessionManager;
    
    // Initialize security manager
    this.securityManager = new SecurityManager({
      rateLimit: this.options.rateLimit,
      monitoring: {
        alertOnHighFailureRate: true,
        failureRateThreshold: 30,
        alertOnSuspiciousActivity: true
      }
    });
    
    logger.info(`HTTP transport configured for ${options.type} mode`, {
      port: this.options.port,
      host: this.options.host,
      path: this.options.path,
      authType: this.options.auth?.type,
      securityEnabled: true
    });
  }

  /**
   * Handle HTTP request (for Cloudflare Workers or other HTTP environments)
   */
  async handleRequest(request: HttpRequest): Promise<HttpResponse> {
    const startTime = Date.now();
    let clientId: string = 'unknown';
    let requestSuccess = false;
    
    try {
      // CORS preflight
      if (request.method === 'OPTIONS') {
        return this.createCorsResponse();
      }

      // Validate HTTP method
      if (request.method !== 'POST') {
        return this.createErrorResponse(405, 'Method not allowed');
      }

      // Generate client ID for security tracking
      const ipAddress = request.headers['x-forwarded-for'] || 
                       request.headers['cf-connecting-ip'] || 
                       request.headers['x-real-ip'] || 
                       'unknown';
      const userAgent = request.headers['user-agent'] || '';
      clientId = SecurityManager.generateClientId(ipAddress, userAgent);

      // Security: Rate limiting with advanced tracking
      const rateLimitResult = this.securityManager.checkRateLimit(clientId, ipAddress, userAgent);
      if (!rateLimitResult.allowed) {
        this.securityManager.recordRequest(clientId, request.url, false, undefined, ipAddress, userAgent);
        return this.createErrorResponse(429, 'Rate limit exceeded', {
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        });
      }

      // Extract session context
      const sessionContext = await this.extractSessionContext(request);
      this.currentSessionContext = sessionContext;

      // Parse JSON-RPC message
      if (!request.body) {
        return this.createErrorResponse(400, 'Request body required');
      }

      let message: JSONRPCMessage;
      try {
        message = JSON.parse(request.body);
      } catch (error) {
        return this.createErrorResponse(400, 'Invalid JSON-RPC message');
      }

      // Validate session for non-auth tools
      if (!this.isAuthTool(message) && !sessionContext.isAuthenticated) {
        return this.createErrorResponse(401, 'Authentication required', {}, {
          error: 'Please authenticate first using passgage_session_login tool',
          sessionRequired: true
        });
      }

      // Process message through MCP handlers
      const response = await this.processMessage(message, sessionContext);
      
      // Mark request as successful
      requestSuccess = true;
      
      return this.createSuccessResponse(response);

    } catch (error: any) {
      logger.error('HTTP request processing error:', { error: error.message, clientId: clientId || 'unknown' });
      return this.createErrorResponse(500, 'Internal server error');
    } finally {
      // Record request for security monitoring
      if (clientId!) {
        const ipAddress = request.headers['x-forwarded-for'] || 
                         request.headers['cf-connecting-ip'] || 
                         request.headers['x-real-ip'] || 'unknown';
        const userAgent = request.headers['user-agent'] || '';
        
        this.securityManager.recordRequest(
          clientId,
          request.url,
          requestSuccess,
          this.currentSessionContext?.sessionId,
          ipAddress,
          userAgent
        );

        // Log request metrics
        const duration = Date.now() - startTime;
        logger.debug('Request processed', {
          clientId,
          sessionId: this.currentSessionContext?.sessionId,
          success: requestSuccess,
          duration,
          ipAddress
        });
      }
    }
  }

  /**
   * Extract session context from HTTP request
   */
  private async extractSessionContext(request: HttpRequest): Promise<SessionContext> {
    const sessionId = request.headers['x-session-id'] || 
                     request.headers['authorization']?.replace('Bearer ', '');

    if (!sessionId) {
      return {
        authMode: 'none',
        isAuthenticated: false
      };
    }

    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      return {
        sessionId,
        authMode: 'none',
        isAuthenticated: false
      };
    }

    return {
      sessionId,
      userId: session.userId,
      authMode: session.authMode,
      isAuthenticated: true
    };
  }

  /**
   * Check if the tool is an authentication tool
   */
  private isAuthTool(message: JSONRPCMessage): boolean {
    if ('method' in message && message.method === 'tools/call') {
      const toolName = (message.params as any)?.name;
      return (toolName && toolName.startsWith('passgage_session_')) || 
             (toolName && toolName.startsWith('passgage_login')) ||
             toolName === 'passgage_auth_status';
    }
    return false;
  }

  /**
   * Process JSON-RPC message through MCP handlers
   */
  private async processMessage(message: JSONRPCMessage, context: SessionContext): Promise<JSONRPCResponse> {
    return new Promise((resolve) => {
      // Simulate message processing - in real implementation, this would
      // be handled by the MCP server's request handlers
      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: 'id' in message ? message.id : 1,
        result: {
          success: true,
          sessionContext: context,
          message: 'HTTP transport message processing placeholder'
        }
      };
      
      // Trigger message handlers
      this.messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          logger.error('Message handler error:', error);
        }
      });

      resolve(response);
    });
  }


  /**
   * Create CORS preflight response
   */
  private createCorsResponse(): HttpResponse {
    return {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  /**
   * Create success HTTP response
   */
  private createSuccessResponse(data: any): HttpResponse {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    };

    return {
      status: 200,
      headers,
      body: JSON.stringify(data, null, 2)
    };
  }

  /**
   * Create error HTTP response
   */
  private createErrorResponse(
    status: number, 
    message: string, 
    additionalHeaders: Record<string, string> = {},
    additionalData: any = {}
  ): HttpResponse {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...additionalHeaders
    };

    const errorResponse = {
      jsonrpc: '2.0',
      error: {
        code: status,
        message,
        ...additionalData
      },
      id: null
    };

    return {
      status,
      headers,
      body: JSON.stringify(errorResponse, null, 2)
    };
  }

  // Transport interface implementation for compatibility
  async start(): Promise<void> {
    logger.info('HTTP transport ready for request handling');
  }

  async send(message: JSONRPCMessage): Promise<void> {
    logger.debug('HTTP transport send (handled via handleRequest):', { message });
  }

  onMessage(handler: (message: JSONRPCMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  onClose(handler: () => void): void {
    this.closeHandlers.add(handler);
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandlers.add(handler);
  }

  async close(): Promise<void> {
    logger.debug('Closing HTTP transport');
    this.closeHandlers.forEach(handler => handler());
  }

  /**
   * Get current session context
   */
  getCurrentSessionContext(): SessionContext | undefined {
    return this.currentSessionContext;
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    return this.securityManager.getSecurityStats();
  }

  /**
   * Get recent security events
   */
  getRecentSecurityEvents(limit?: number) {
    return this.securityManager.getRecentEvents(limit);
  }

  /**
   * Get client information (for admin purposes)
   */
  getClientInfo(clientId: string) {
    return this.securityManager.getClientInfo(clientId);
  }
}