import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sessionManager } from '../utils/session.js';
import { PassgageAPIClient } from '../api/client.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

/**
 * Session-based authentication tools for remote MCP deployments
 * These tools allow users to authenticate without exposing credentials in config
 */

// Session login tool - creates new session with user credentials
export const sessionLoginTool: Tool = {
  name: 'passgage_session_login',
  description: 'Create a new authentication session with your Passgage credentials',
  inputSchema: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'Your Passgage email address'
      },
      password: {
        type: 'string',
        description: 'Your Passgage password'
      },
      mode: {
        type: 'string',
        enum: ['user', 'company'],
        description: 'Authentication mode (user for personal access, company for admin access)',
        default: 'user'
      }
    },
    required: ['email', 'password']
  }
};

export async function handleSessionLogin(args: any) {
  try {
    const { email, password, mode = 'user' } = args;

    logger.info('Creating new authentication session', { email, mode });

    // Create API client for authentication
    const apiClient = new PassgageAPIClient({
      baseURL: env.PASSGAGE_BASE_URL,
      timeout: env.PASSGAGE_TIMEOUT,
      debug: env.PASSGAGE_DEBUG
    });

    // Attempt login to validate credentials
    const loginResult = await apiClient.login({ email, password });
    
    if (!loginResult.success) {
      return errorResponse('Login failed: Invalid credentials', 'AUTH_FAILED');
    }

    // Create session with credentials
    const sessionId = sessionManager.createSession({
      userEmail: email,
      userPassword: password,
      jwtToken: loginResult.data?.token
    });

    logger.info('Authentication session created', { sessionId, mode });

    return successResponse({
      sessionId,
      mode,
      message: 'Authentication session created successfully',
      expiresIn: '8 hours'
    }, 'Session created successfully');

  } catch (error: any) {
    logger.error('Session login failed', error);
    return errorResponse(`Login failed: ${error.message}`, 'LOGIN_ERROR');
  }
}

// Session login with API key
export const sessionLoginWithApiKeyTool: Tool = {
  name: 'passgage_session_login_api_key',
  description: 'Create a new authentication session with your company API key',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: {
        type: 'string',
        description: 'Your Passgage company API key'
      }
    },
    required: ['apiKey']
  }
};

export async function handleSessionLoginWithApiKey(args: any) {
  try {
    const { apiKey } = args;

    logger.info('Creating new API key session');

    // Validate API key by making a test request
    const apiClient = new PassgageAPIClient({
      baseURL: env.PASSGAGE_BASE_URL,
      apiKey: apiKey,
      timeout: env.PASSGAGE_TIMEOUT,
      debug: env.PASSGAGE_DEBUG
    });

    // Test API key with a simple request
    const authStatus = await apiClient.getAuthContext();
    if (authStatus.mode !== 'company') {
      return errorResponse('Invalid API key or insufficient permissions', 'AUTH_FAILED');
    }

    // Create session with API key
    const sessionId = sessionManager.createSession({
      apiKey: apiKey
    });

    logger.info('API key session created', { sessionId });

    return successResponse({
      sessionId,
      mode: 'company',
      message: 'Company authentication session created successfully',
      expiresIn: '8 hours'
    }, 'API key session created successfully');

  } catch (error: any) {
    logger.error('API key session login failed', error);
    return errorResponse(`API key login failed: ${error.message}`, 'API_KEY_ERROR');
  }
}

// Switch session mode
export const sessionSwitchModeTool: Tool = {
  name: 'passgage_session_switch_mode',
  description: 'Switch authentication mode within your current session',
  inputSchema: {
    type: 'object',
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

export async function handleSessionSwitchMode(args: any) {
  try {
    const { sessionId, mode } = args;

    logger.info('Switching session mode', { sessionId, mode });

    const success = sessionManager.switchMode(sessionId, mode);
    if (!success) {
      return errorResponse('Mode switch failed: Invalid session or missing credentials for target mode', 'INVALID_SESSION');
    }

    const authContext = sessionManager.getAuthContext(sessionId);
    
    return successResponse({
      sessionId,
      currentMode: authContext?.mode,
      message: `Switched to ${mode} mode successfully`
    }, `Switched to ${mode} mode`);

  } catch (error: any) {
    logger.error('Session mode switch failed', error);
    return errorResponse(`Mode switch failed: ${error.message}`, 'MODE_SWITCH_ERROR');
  }
}

// Session status
export const sessionStatusTool: Tool = {
  name: 'passgage_session_status',
  description: 'Check your current session status and available modes',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Your session ID'
      }
    },
    required: ['sessionId']
  }
};

export async function handleSessionStatus(args: any) {
  try {
    const { sessionId } = args;

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return errorResponse('Session not found or expired', 'SESSION_NOT_FOUND');
    }

    const credentials = sessionManager.getCredentials(sessionId);
    const availableModes: string[] = [];
    
    if (credentials?.apiKey) availableModes.push('company');
    if (credentials?.userEmail) availableModes.push('user');

    return successResponse({
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
    return errorResponse(`Status check failed: ${error.message}`, 'STATUS_ERROR');
  }
}

// Session logout
export const sessionLogoutTool: Tool = {
  name: 'passgage_session_logout',
  description: 'Destroy your authentication session and clear credentials',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Your session ID'
      }
    },
    required: ['sessionId']
  }
};

export async function handleSessionLogout(args: any) {
  try {
    const { sessionId } = args;

    logger.info('Destroying session', { sessionId });

    const success = sessionManager.destroySession(sessionId);
    
    return successResponse({
      sessionId,
      destroyed: success,
      message: 'Session destroyed successfully'
    }, 'Logged out successfully');

  } catch (error: any) {
    logger.error('Session logout failed', error);
    return errorResponse(`Logout failed: ${error.message}`, 'LOGOUT_ERROR');
  }
}