import { z } from 'zod';
import { BaseTool } from './base.tool.js';
import { ToolMetadata } from './index.js';
import { PassgageAPIClient } from '../api/client.js';

const loginSchema = z.object({
  email: z.string().email().describe('User email address'),
  password: z.string().min(1).describe('User password')
});

const refreshSchema = z.object({
  token: z.string().optional().describe('Refresh token (optional, uses stored token if not provided)')
});

const logoutSchema = z.object({});

const statusSchema = z.object({});

export class AuthTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_login',
      description: 'Authenticate with Passgage API using email and password',
      category: 'auth'
    };
  }

  getInputSchema(): z.ZodSchema {
    return loginSchema;
  }

  async execute(args: any): Promise<any> {
    // This is a simplified version - in production, split into separate tools
    const validated = loginSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }
    
    try {
      const result = await this.apiClient.login({
        email: validated.email,
        password: validated.password
      });
      
      if (result.success) {
        return this.successResponse({
          authenticated: true,
          mode: 'user',
          token: result.data.token,
          expiresAt: result.data.expires_at,
          user: result.data.user
        }, 'Successfully logged in');
      } else {
        return this.errorResponse('Login failed', result.message);
      }
    } catch (error: any) {
      return this.errorResponse('Login failed', error.message || 'Invalid credentials');
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
            description: 'User email address'
          },
          password: {
            type: 'string',
            description: 'User password',
            minLength: 1
          }
        },
        required: ['email', 'password']
      }
    };
  }
}

// Additional auth tools would be separate classes
export class RefreshTokenTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_refresh_token',
      description: 'Refresh JWT authentication token',
      category: 'auth'
    };
  }

  getInputSchema(): z.ZodSchema {
    return refreshSchema;
  }

  async execute(_args: z.infer<typeof refreshSchema>): Promise<any> {
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }
    
    try {
      const result = await this.apiClient.refreshToken();
      
      if (result.success) {
        return this.successResponse({
          refreshed: true,
          token: result.data.token,
          expiresAt: result.data.expires_at
        }, 'Token refreshed successfully');
      } else {
        return this.errorResponse('Token refresh failed', result.message);
      }
    } catch (error: any) {
      return this.errorResponse('Token refresh failed', error.message || 'Unable to refresh token');
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
          token: {
            type: 'string',
            description: 'Refresh token (optional, uses stored token if not provided)'
          }
        }
      }
    };
  }
}

export class LogoutTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_logout',
      description: 'Logout and clear authentication',
      category: 'auth'
    };
  }

  getInputSchema(): z.ZodSchema {
    return logoutSchema;
  }

  async execute(_args: z.infer<typeof logoutSchema>): Promise<any> {
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }
    
    try {
      const result = await this.apiClient.logout();
      
      if (result.success) {
        return this.successResponse({
          loggedOut: true
        }, 'Successfully logged out');
      } else {
        return this.errorResponse('Logout failed', result.message);
      }
    } catch (error: any) {
      return this.errorResponse('Logout failed', error.message || 'Unable to logout');
    }
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

export class AuthStatusTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_auth_status',
      description: 'Check current authentication status',
      category: 'auth'
    };
  }

  getInputSchema(): z.ZodSchema {
    return statusSchema;
  }

  async execute(_args: z.infer<typeof statusSchema>): Promise<any> {
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }
    
    const mode = this.apiClient.getAuthMode();
    const context = this.apiClient.getAuthContext();
    const isAuthenticated = this.apiClient.isAuthenticated();
    
    return this.successResponse({
      authenticated: isAuthenticated,
      mode,
      userInfo: context.userInfo,
      expiresAt: context.tokenExpiresAt,
      hasApiKey: !!context.companyApiKey,
      hasJwtToken: !!context.userJwtToken
    });
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

const switchModeSchema = z.object({});

export class SwitchToCompanyModeTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_switch_to_company_mode',
      description: 'Switch to company-level access mode (requires API key)',
      category: 'auth'
    };
  }

  getInputSchema(): z.ZodSchema {
    return switchModeSchema;
  }

  async execute(_args: z.infer<typeof switchModeSchema>): Promise<any> {
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }
    
    const success = this.apiClient.switchToCompanyMode();
    
    if (success) {
      return this.successResponse({
        mode: 'company',
        switched: true
      }, 'Switched to company mode');
    } else {
      return this.errorResponse('Cannot switch to company mode', 'API key not configured');
    }
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

export class SwitchToUserModeTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_switch_to_user_mode',
      description: 'Switch to user-level access mode (requires active JWT token)',
      category: 'auth'
    };
  }

  getInputSchema(): z.ZodSchema {
    return switchModeSchema;
  }

  async execute(_args: z.infer<typeof switchModeSchema>): Promise<any> {
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }
    
    const success = this.apiClient.switchToUserMode();
    
    if (success) {
      return this.successResponse({
        mode: 'user',
        switched: true
      }, 'Switched to user mode');
    } else {
      return this.errorResponse('Cannot switch to user mode', 'No active JWT token. Please login first.');
    }
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