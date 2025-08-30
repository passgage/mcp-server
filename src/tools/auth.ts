import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PassgageAPIClient } from '../api/client.js';
import { AuthLoginRequest } from '../types/api.js';

export function createAuthTools(_client: PassgageAPIClient): Tool[] {
  return [
    {
      name: 'passgage_login',
      description: 'Login to Passgage API with email and password to get JWT token',
      inputSchema: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'User email address'
          },
          password: {
            type: 'string',
            description: 'User password'
          }
        },
        required: ['email', 'password']
      }
    },
    {
      name: 'passgage_refresh_token',
      description: 'Refresh the current JWT token to extend its validity',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: 'passgage_logout',
      description: 'Logout from Passgage API and invalidate the current session',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: 'passgage_auth_status',
      description: 'Check authentication status, current mode, and available authentication methods',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: 'passgage_set_company_mode',
      description: 'Switch to company API key authentication mode',
      inputSchema: {
        type: 'object',
        properties: {
          api_key: {
            type: 'string',
            description: 'Company API key for authentication'
          }
        },
        required: ['api_key']
      }
    },
    {
      name: 'passgage_switch_to_user_mode',
      description: 'Switch to user JWT authentication mode (requires previous user login)',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: 'passgage_switch_to_company_mode',
      description: 'Switch to company API key authentication mode (requires previous API key setup)',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: 'passgage_get_auth_modes',
      description: 'Get available authentication modes and their status',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  ];
}

export async function handleAuthTool(
  name: string,
  args: any,
  client: PassgageAPIClient
): Promise<any> {
  switch (name) {
    case 'passgage_login': {
      const credentials: AuthLoginRequest = {
        email: args.email,
        password: args.password
      };
      
      const result = await client.login(credentials);
      
      return {
        success: result.success,
        message: result.message,
        user: result.data.user,
        token_expires_at: result.data.expires_at,
        authenticated: client.isAuthenticated()
      };
    }

    case 'passgage_refresh_token': {
      if (!client.isAuthenticated()) {
        throw new Error('Not authenticated. Please login first.');
      }
      
      const result = await client.refreshToken();
      
      return {
        success: result.success,
        message: result.message,
        token_expires_at: result.data.expires_at,
        authenticated: client.isAuthenticated()
      };
    }

    case 'passgage_logout': {
      if (!client.isAuthenticated()) {
        return {
          success: true,
          message: 'Already logged out',
          authenticated: false
        };
      }
      
      const result = await client.logout();
      
      return {
        success: result.success,
        message: result.message,
        authenticated: client.isAuthenticated()
      };
    }

    case 'passgage_auth_status': {
      const authContext = client.getAuthContext();
      return {
        authenticated: client.isAuthenticated(),
        current_mode: authContext.mode,
        has_company_api_key: !!authContext.companyApiKey,
        has_user_jwt_token: !!authContext.userJwtToken,
        user_info: authContext.userInfo,
        token_expires_at: authContext.tokenExpiresAt,
        available_modes: {
          company: !!authContext.companyApiKey,
          user: !!authContext.userJwtToken
        }
      };
    }

    case 'passgage_set_company_mode': {
      client.setCompanyMode(args.api_key);
      return {
        success: true,
        message: 'Switched to company API key authentication mode',
        current_mode: client.getAuthMode(),
        authenticated: client.isAuthenticated()
      };
    }

    case 'passgage_switch_to_user_mode': {
      const switched = client.switchToUserMode();
      if (switched) {
        return {
          success: true,
          message: 'Switched to user JWT authentication mode',
          current_mode: client.getAuthMode(),
          authenticated: client.isAuthenticated()
        };
      } else {
        throw new Error('Cannot switch to user mode: No valid JWT token available. Please login first.');
      }
    }

    case 'passgage_switch_to_company_mode': {
      const switched = client.switchToCompanyMode();
      if (switched) {
        return {
          success: true,
          message: 'Switched to company API key authentication mode',
          current_mode: client.getAuthMode(),
          authenticated: client.isAuthenticated()
        };
      } else {
        throw new Error('Cannot switch to company mode: No API key available. Please set API key first.');
      }
    }

    case 'passgage_get_auth_modes': {
      const authContext = client.getAuthContext();
      return {
        current_mode: authContext.mode,
        available_modes: {
          company: {
            available: !!authContext.companyApiKey,
            description: 'System-level access with company API key',
            permissions: 'Full access to all company data and users'
          },
          user: {
            available: !!authContext.userJwtToken,
            description: 'User-level access with JWT token',
            permissions: 'Limited to user\'s own data and permissions',
            user_info: authContext.userInfo,
            expires_at: authContext.tokenExpiresAt
          }
        },
        can_switch_to: {
          company: !!authContext.companyApiKey && authContext.mode !== 'company',
          user: !!authContext.userJwtToken && authContext.mode !== 'user'
        }
      };
    }

    default:
      throw new Error(`Unknown auth tool: ${name}`);
  }
}