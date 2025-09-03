import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PassgageAPIClient } from '../api/client.js';
import { ToolMetadata } from './index.js';
import { z } from 'zod';

export interface ToolPermissionCheck {
  allowed: boolean;
  reason?: string;
}

export abstract class BaseTool {
  protected apiClient?: PassgageAPIClient;
  
  constructor(apiClient?: PassgageAPIClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get tool metadata
   */
  abstract getMetadata(): ToolMetadata;

  /**
   * Get the Zod schema for input validation
   */
  abstract getInputSchema(): z.ZodSchema;

  /**
   * Execute the tool with validated inputs
   */
  abstract execute(args: any): Promise<any>;

  /**
   * Check if the tool can be executed with current permissions
   */
  async checkPermissions(): Promise<ToolPermissionCheck> {
    const metadata = this.getMetadata();
    
    // If no API client required, allow
    if (!this.apiClient) {
      return { allowed: true };
    }
    
    // Check authentication
    const authMode = this.apiClient.getAuthMode();
    
    if (authMode === 'none') {
      return { 
        allowed: false, 
        reason: 'Not authenticated. Please login or set API key first.' 
      };
    }
    
    // Check permissions if defined
    if (metadata.permissions) {
      const allowed = (authMode === 'company' && metadata.permissions.companyMode) ||
                     (authMode === 'user' && metadata.permissions.userMode);
      
      if (!allowed) {
        const reason = authMode === 'user' 
          ? 'This operation requires company-level access. Please switch to company mode.'
          : `This operation is not available in ${authMode} mode.`;
        
        return { allowed: false, reason };
      }
    }
    
    return { allowed: true };
  }

  /**
   * Convert to MCP Tool format
   */
  toMCPTool(): Tool {
    const metadata = this.getMetadata();
    
    // Default JSON schema structure required by MCP
    // Override this method in derived classes to provide actual schema
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {}
      }
    };
  }

  /**
   * Helper method to convert Zod schema to JSON Schema
   * This is a simplified version - in production, use a library like zod-to-json-schema
   */
  protected zodToJsonSchema(zodSchema: z.ZodSchema): any {
    // For now, we'll manually define schemas in each tool
    // In production, use: import { zodToJsonSchema } from 'zod-to-json-schema';
    console.log('Converting schema:', zodSchema.constructor.name); // TODO: Remove in production
    return {
      type: 'object',
      properties: {},
      required: []
    };
  }

  /**
   * Helper method for consistent error responses
   */
  protected errorResponse(message: string, details?: any): any {
    return {
      success: false,
      error: message,
      details
    };
  }

  /**
   * Helper method for consistent success responses
   */
  protected successResponse(data: any, message?: string): any {
    return {
      success: true,
      message,
      data
    };
  }
}