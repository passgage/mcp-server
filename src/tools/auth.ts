import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PassgageAPIClient } from '../api/client.js';
import { AuthLoginRequest } from '../types/api.js';

export function createAuthTools(client: PassgageAPIClient): Tool[] {
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
      description: 'Check if the client is authenticated and get token information',
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
      return {
        authenticated: client.isAuthenticated(),
        has_jwt_token: !!client.getToken(),
        token: client.getToken() ? 'Present (hidden for security)' : null
      };
    }

    default:
      throw new Error(`Unknown auth tool: ${name}`);
  }
}