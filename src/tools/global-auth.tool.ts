import { z } from 'zod';
import { BaseTool } from './base.tool.js';
import { ToolMetadata } from './index.js';
import { PassgageAPIClient } from '../api/client.js';
import { SessionManager } from '../utils/session.js';
// Removed config/env import to avoid validation issues in Cloudflare Workers

// Schema definitions for global session tools
const sessionLoginSchema = z.object({
  email: z.string().email().describe('Passgage user email'),
  password: z.string().min(1).describe('Passgage user password'),
  sessionName: z.string().optional().describe('Optional session name for identification')
});

const sessionCreateSchema = z.object({
  credentials: z.object({
    apiKey: z.string().optional().describe('Company API key'),
    userEmail: z.string().email().optional().describe('User email'),
    userPassword: z.string().optional().describe('User password')
  }).describe('Authentication credentials'),
  authMode: z.enum(['company', 'user']).optional().describe('Preferred authentication mode'),
  sessionName: z.string().optional().describe('Optional session name')
});

const sessionStatusSchema = z.object({
  sessionId: z.string().optional().describe('Session ID to check (uses current session if not provided)')
});

const sessionListSchema = z.object({});

const sessionSwitchModeSchema = z.object({
  mode: z.enum(['company', 'user']).describe('Authentication mode to switch to'),
  sessionId: z.string().optional().describe('Session ID (uses current session if not provided)')
});

/**
 * Session-based login tool for global MCP server
 * Creates a new session and authenticates with Passgage
 */
export class SessionLoginTool extends BaseTool {
  private sessionManager: SessionManager;

  constructor(apiClient: PassgageAPIClient, sessionManager: SessionManager) {
    super(apiClient);
    this.sessionManager = sessionManager;
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_session_login',
      description: 'Login to Passgage and create a new session',
      category: 'Global Authentication',
      permissions: {
        companyMode: false, // No auth required for login
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return sessionLoginSchema;
  }

  async execute(args: z.infer<typeof sessionLoginSchema>): Promise<any> {
    try {
      // Create a temporary API client for authentication
      const tempClient = new PassgageAPIClient({
        baseURL: 'https://api.passgage.com'
      });

      // Attempt login
      const loginResult = await tempClient.login({
        email: args.email,
        password: args.password
      });

      if (!loginResult.success) {
        return this.errorResponse('Login failed', loginResult.message);
      }

      // Create session with authenticated credentials
      const sessionId = await this.sessionManager.createSession({
        userEmail: args.email,
        userPassword: args.password,
        jwtToken: loginResult.data?.token
      });

      // Get session details
      const session = await this.sessionManager.getSession(sessionId);
      if (!session) {
        return this.errorResponse('Failed to create session');
      }

      return this.successResponse({
        sessionId,
        authMode: session.authMode,
        expiresAt: session.expiresAt.toISOString(),
        user: loginResult.data?.user,
        sessionName: args.sessionName,
        instructions: {
          message: 'Session created successfully! Use this session ID for future requests.',
          usage: [
            'Add X-Session-ID header to HTTP requests',
            'Or use Authorization: Bearer {sessionId} header',
            'Session will auto-expire after 8 hours of inactivity'
          ]
        }
      }, `Session created for ${args.email}`);

    } catch (error: any) {
      return this.errorResponse('Authentication failed', error.message);
    }
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Passgage user email address'
          },
          password: {
            type: 'string',
            description: 'Passgage user password',
            minLength: 1
          },
          sessionName: {
            type: 'string',
            description: 'Optional session name for identification'
          }
        },
        required: ['email', 'password']
      }
    };
  }
}

/**
 * Create session tool for advanced use cases
 */
export class SessionCreateTool extends BaseTool {
  private sessionManager: SessionManager;

  constructor(apiClient: PassgageAPIClient, sessionManager: SessionManager) {
    super(apiClient);
    this.sessionManager = sessionManager;
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_session_create',
      description: 'Create a session with pre-configured credentials',
      category: 'Global Authentication',
      permissions: {
        companyMode: false,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return sessionCreateSchema;
  }

  async execute(args: z.infer<typeof sessionCreateSchema>): Promise<any> {
    try {
      const { credentials, authMode, sessionName } = args;

      // Validate that at least some credentials are provided
      if (!credentials.apiKey && !credentials.userEmail) {
        return this.errorResponse('At least API key or user email must be provided');
      }

      // Create session
      const sessionId = await this.sessionManager.createSession({
        apiKey: credentials.apiKey,
        userEmail: credentials.userEmail,
        userPassword: credentials.userPassword
      });

      // Get session details
      const session = await this.sessionManager.getSession(sessionId);
      if (!session) {
        return this.errorResponse('Failed to create session');
      }

      // Switch to preferred auth mode if specified
      if (authMode && authMode !== session.authMode) {
        const switched = this.sessionManager.switchMode(sessionId, authMode);
        if (!switched) {
          return this.errorResponse(`Cannot switch to ${authMode} mode - credentials not available`);
        }
      }

      const finalSession = await this.sessionManager.getSession(sessionId);
      
      return this.successResponse({
        sessionId,
        authMode: finalSession?.authMode,
        expiresAt: finalSession?.expiresAt.toISOString(),
        sessionName,
        availableModes: {
          company: !!credentials.apiKey,
          user: !!credentials.userEmail
        }
      }, 'Session created successfully');

    } catch (error: any) {
      return this.errorResponse('Session creation failed', error.message);
    }
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          credentials: {
            type: 'object',
            properties: {
              apiKey: { type: 'string', description: 'Company API key' },
              userEmail: { type: 'string', format: 'email', description: 'User email' },
              userPassword: { type: 'string', description: 'User password' }
            },
            description: 'Authentication credentials'
          },
          authMode: {
            type: 'string',
            enum: ['company', 'user'],
            description: 'Preferred authentication mode'
          },
          sessionName: { type: 'string', description: 'Optional session name' }
        },
        required: ['credentials']
      }
    };
  }
}

/**
 * Session status tool
 */
export class SessionStatusTool extends BaseTool {
  private sessionManager: SessionManager;

  constructor(apiClient: PassgageAPIClient, sessionManager: SessionManager) {
    super(apiClient);
    this.sessionManager = sessionManager;
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_session_status',
      description: 'Check session authentication status and details',
      category: 'Global Authentication',
      permissions: {
        companyMode: false,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return sessionStatusSchema;
  }

  async execute(args: z.infer<typeof sessionStatusSchema>): Promise<any> {
    const sessionId = args.sessionId; // In HTTP transport, this would be automatically detected
    
    if (!sessionId) {
      return this.errorResponse('Session ID required or not found in request context');
    }

    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      return this.errorResponse('Session not found or expired');
    }

    const now = new Date();
    const timeRemaining = session.expiresAt.getTime() - now.getTime();
    const isExpired = timeRemaining <= 0;

    return this.successResponse({
      sessionId,
      isValid: !isExpired,
      authMode: session.authMode,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      lastUsed: session.lastUsed.toISOString(),
      timeRemainingMs: Math.max(0, timeRemaining),
      userId: session.userId,
      companyId: session.companyId,
      availableCredentials: {
        hasApiKey: !!session.credentials?.apiKey,
        hasUserCredentials: !!(session.credentials?.userEmail && session.credentials?.userPassword),
        hasJwtToken: !!session.credentials?.jwtToken
      }
    });
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID to check (uses current session if not provided)'
          }
        }
      }
    };
  }
}

/**
 * List active sessions tool
 */
export class SessionListTool extends BaseTool {
  private sessionManager: SessionManager;

  constructor(apiClient: PassgageAPIClient, sessionManager: SessionManager) {
    super(apiClient);
    this.sessionManager = sessionManager;
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_session_list',
      description: 'List all active sessions (admin tool)',
      category: 'Global Authentication',
      permissions: {
        companyMode: false,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return sessionListSchema;
  }

  async execute(_args: z.infer<typeof sessionListSchema>): Promise<any> {
    const activeSessionsCount = this.sessionManager.getActiveSessionsCount();
    
    return this.successResponse({
      totalSessions: activeSessionsCount,
      serverStats: {
        uptime: typeof process !== 'undefined' ? process.uptime() : 'N/A',
        memory: typeof process !== 'undefined' ? process.memoryUsage() : 'N/A',
        timestamp: new Date().toISOString()
      },
      info: 'Session details are not exposed for security reasons'
    }, `Found ${activeSessionsCount} active sessions`);
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {}
      }
    };
  }
}

/**
 * Switch session auth mode tool
 */
export class SessionSwitchModeTool extends BaseTool {
  private sessionManager: SessionManager;

  constructor(apiClient: PassgageAPIClient, sessionManager: SessionManager) {
    super(apiClient);
    this.sessionManager = sessionManager;
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_session_switch_mode',
      description: 'Switch authentication mode within a session',
      category: 'Global Authentication',
      permissions: {
        companyMode: false,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return sessionSwitchModeSchema;
  }

  async execute(args: z.infer<typeof sessionSwitchModeSchema>): Promise<any> {
    const { mode, sessionId } = args;
    
    if (!sessionId) {
      return this.errorResponse('Session ID required');
    }

    const switched = this.sessionManager.switchMode(sessionId, mode);
    if (!switched) {
      return this.errorResponse(`Cannot switch to ${mode} mode`, 
        'Required credentials not available in this session');
    }

    const session = await this.sessionManager.getSession(sessionId);
    return this.successResponse({
      sessionId,
      newMode: mode,
      switched: true,
      expiresAt: session?.expiresAt.toISOString()
    }, `Switched to ${mode} mode successfully`);
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          mode: {
            type: 'string',
            enum: ['company', 'user'],
            description: 'Authentication mode to switch to'
          },
          sessionId: {
            type: 'string',
            description: 'Session ID (uses current session if not provided)'
          }
        },
        required: ['mode']
      }
    };
  }
}