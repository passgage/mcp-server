import { z } from 'zod';
import { BaseTool } from './base.tool.js';
import { ToolMetadata } from './index.js';
import { PassgageAPIClient } from '../api/client.js';
import { SessionManager } from '../utils/session.js';
import { logger } from '../config/logger.js';
// Removed config/env import to avoid validation issues in Cloudflare Workers

// Schema definitions for session tools
const sessionLoginSchema = z.object({
  email: z.string().email().describe('Your Passgage email address'),
  password: z.string().min(1).describe('Your Passgage password'),
  mode: z.enum(['user', 'company']).default('user').describe('Authentication mode (user for personal access, company for admin access)')
});

const sessionLoginWithApiKeySchema = z.object({
  apiKey: z.string().min(1).describe('Your Passgage company API key')
});

const sessionSwitchModeSchema = z.object({
  sessionId: z.string().describe('Your session ID'),
  mode: z.enum(['user', 'company']).describe('Target authentication mode')
});

const sessionStatusSchema = z.object({
  sessionId: z.string().describe('Your session ID')
});

const sessionLogoutSchema = z.object({
  sessionId: z.string().describe('Your session ID')
});

/**
 * Session-based authentication tools for remote MCP deployments
 * These tools allow users to authenticate without exposing credentials in config
 */

/**
 * Session login tool - creates new session with user credentials
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
      description: 'Create a new authentication session with your Passgage credentials',
      category: 'Session Authentication',
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
      const { email, password, mode = 'user' } = args;

      logger.info('Creating new authentication session', { email, mode });

      // Create API client for authentication
      const apiClient = new PassgageAPIClient({
        baseURL: 'https://api.passgage.com',
        timeout: 30000,
        debug: false
      });

      // Attempt login to validate credentials
      const loginResult = await apiClient.login({ email, password });
      
      if (!loginResult.success) {
        return this.errorResponse('Login failed: Invalid credentials', 'AUTH_FAILED');
      }

      // Create session with credentials
      const sessionId = await this.sessionManager.createSession({
        userEmail: email,
        userPassword: password,
        jwtToken: loginResult.data?.token
      });

      logger.info('Authentication session created', { sessionId, mode });

      return this.successResponse({
        sessionId,
        mode,
        message: 'Authentication session created successfully',
        expiresIn: '8 hours'
      }, 'Session created successfully');

    } catch (error: any) {
      logger.error('Session login failed', error);
      return this.errorResponse(`Login failed: ${error.message}`, 'LOGIN_ERROR');
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
            description: 'Your Passgage email address'
          },
          password: {
            type: 'string',
            description: 'Your Passgage password'
          },
          mode: {
            type: 'string',
            enum: ['user', 'company'],
            default: 'user',
            description: 'Authentication mode (user for personal access, company for admin access)'
          }
        },
        required: ['email', 'password']
      }
    };
  }
}

/**
 * Session login with API key tool
 */
export class SessionLoginWithApiKeyTool extends BaseTool {
  private sessionManager: SessionManager;

  constructor(apiClient: PassgageAPIClient, sessionManager: SessionManager) {
    super(apiClient);
    this.sessionManager = sessionManager;
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_session_login_api_key',
      description: 'Create a new authentication session with your company API key',
      category: 'Session Authentication',
      permissions: {
        companyMode: false,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return sessionLoginWithApiKeySchema;
  }

  async execute(args: z.infer<typeof sessionLoginWithApiKeySchema>): Promise<any> {
    try {
      const { apiKey } = args;

      logger.info('Creating new API key session');

      // Validate API key by making a test request
      const apiClient = new PassgageAPIClient({
        baseURL: 'https://api.passgage.com',
        apiKey: apiKey,
        timeout: 30000,
        debug: false
      });

      // Test API key with a simple request
      const authStatus = await apiClient.getAuthContext();
      if (authStatus.mode !== 'company') {
        return this.errorResponse('Invalid API key or insufficient permissions', 'AUTH_FAILED');
      }

      // Create session with API key
      const sessionId = await this.sessionManager.createSession({
        apiKey: apiKey
      });

      logger.info('API key session created', { sessionId });

      return this.successResponse({
        sessionId,
        mode: 'company',
        message: 'Company authentication session created successfully',
        expiresIn: '8 hours'
      }, 'API key session created successfully');

    } catch (error: any) {
      logger.error('API key session login failed', error);
      return this.errorResponse(`API key login failed: ${error.message}`, 'API_KEY_ERROR');
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
          apiKey: {
            type: 'string',
            description: 'Your Passgage company API key'
          }
        },
        required: ['apiKey']
      }
    };
  }
}

/**
 * Switch session mode tool
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
      description: 'Switch authentication mode within your current session',
      category: 'Session Authentication',
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
    try {
      const { sessionId, mode } = args;

      logger.info('Switching session mode', { sessionId, mode });

      const success = this.sessionManager.switchMode(sessionId, mode);
      if (!success) {
        return this.errorResponse('Mode switch failed: Invalid session or missing credentials for target mode', 'INVALID_SESSION');
      }

      const authContext = await this.sessionManager.getAuthContext(sessionId);
      
      return this.successResponse({
        sessionId,
        currentMode: authContext?.mode,
        message: `Switched to ${mode} mode successfully`
      }, `Switched to ${mode} mode`);

    } catch (error: any) {
      logger.error('Session mode switch failed', error);
      return this.errorResponse(`Mode switch failed: ${error.message}`, 'MODE_SWITCH_ERROR');
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
          sessionId: {
            type: 'string',
            description: 'Your session ID'
          },
          mode: {
            type: 'string',
            enum: ['user', 'company'],
            description: 'Target authentication mode'
          }
        },
        required: ['sessionId', 'mode']
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
      description: 'Check your current session status and available modes',
      category: 'Session Authentication',
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
    try {
      const { sessionId } = args;

      const session = await this.sessionManager.getSession(sessionId);
      if (!session) {
        return this.errorResponse('Session not found or expired', 'SESSION_NOT_FOUND');
      }

      const credentials = await this.sessionManager.getCredentials(sessionId);
      const availableModes: string[] = [];
      
      if (credentials?.apiKey) availableModes.push('company');
      if (credentials?.userEmail) availableModes.push('user');

      return this.successResponse({
        sessionId,
        currentMode: session.authMode,
        availableModes,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastUsed: session.lastUsed,
        isActive: true
      }, 'Session status retrieved');

    } catch (error: any) {
      logger.error('Session status check failed', error);
      return this.errorResponse(`Status check failed: ${error.message}`, 'STATUS_ERROR');
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
          sessionId: {
            type: 'string',
            description: 'Your session ID'
          }
        },
        required: ['sessionId']
      }
    };
  }
}

/**
 * Session logout tool
 */
export class SessionLogoutTool extends BaseTool {
  private sessionManager: SessionManager;

  constructor(apiClient: PassgageAPIClient, sessionManager: SessionManager) {
    super(apiClient);
    this.sessionManager = sessionManager;
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_session_logout',
      description: 'Destroy your authentication session and clear credentials',
      category: 'Session Authentication',
      permissions: {
        companyMode: false,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return sessionLogoutSchema;
  }

  async execute(args: z.infer<typeof sessionLogoutSchema>): Promise<any> {
    try {
      const { sessionId } = args;

      logger.info('Destroying session', { sessionId });

      const success = this.sessionManager.destroySession(sessionId);
      
      return this.successResponse({
        sessionId,
        destroyed: success,
        message: 'Session destroyed successfully'
      }, 'Logged out successfully');

    } catch (error: any) {
      logger.error('Session logout failed', error);
      return this.errorResponse(`Logout failed: ${error.message}`, 'LOGOUT_ERROR');
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
          sessionId: {
            type: 'string',
            description: 'Your session ID'
          }
        },
        required: ['sessionId']
      }
    };
  }
}