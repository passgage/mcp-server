import { z } from 'zod';
import { BaseTool } from './base.tool.js';
import { ToolMetadata } from './index.js';

const pingSchema = z.object({
  echo: z.string().optional().describe('Optional message to echo back')
});

export class PingTool extends BaseTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'ping',
      description: 'Simple ping tool to test server connectivity',
      category: 'system'
    };
  }

  getInputSchema(): z.ZodSchema {
    return pingSchema;
  }

  async execute(args: z.infer<typeof pingSchema>): Promise<any> {
    const response = {
      pong: true,
      timestamp: new Date().toISOString(),
      echo: args.echo
    };
    
    return this.successResponse(response, 'Pong!');
  }

  // Override to provide proper JSON schema
  toMCPTool() {
    const metadata = this.getMetadata();
    
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          echo: {
            type: 'string',
            description: 'Optional message to echo back'
          }
        }
      }
    };
  }
}