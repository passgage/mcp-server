import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Prompt, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../config/logger.js';

export interface PromptMetadata {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export abstract class BasePrompt {
  abstract getMetadata(): PromptMetadata;
  abstract render(args: Record<string, string>): string;
  
  toMCPPrompt(): Prompt {
    const metadata = this.getMetadata();
    return {
      name: metadata.name,
      description: metadata.description,
      arguments: metadata.arguments
    };
  }
}

export class PromptRegistry {
  private prompts = new Map<string, BasePrompt>();
  private server: Server;

  constructor(server: Server) {
    this.server = server;
  }

  async registerAll(): Promise<void> {
    logger.info('Starting prompt registration...');
    
    // Register built-in prompts
    this.registerPrompt(new TroubleshootingPrompt());
    this.registerPrompt(new OnboardingPrompt());
    this.registerPrompt(new ApiExplorerPrompt());
    
    // Setup MCP handlers
    this.setupHandlers();
  }

  registerPrompt(prompt: BasePrompt): void {
    const metadata = prompt.getMetadata();
    this.prompts.set(metadata.name, prompt);
    logger.debug(`Registered prompt: ${metadata.name}`);
  }

  private setupHandlers(): void {
    // List prompts handler
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts: Prompt[] = [];
      
      for (const prompt of this.prompts.values()) {
        prompts.push(prompt.toMCPPrompt());
      }
      
      return { prompts };
    });

    // Get prompt handler
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const prompt = this.prompts.get(name);
      if (!prompt) {
        throw new Error(`Unknown prompt: ${name}`);
      }
      
      try {
        const rendered = prompt.render(args || {});
        
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: rendered
            }
          }]
        };
      } catch (error: any) {
        logger.error(`Error rendering prompt ${name}:`, error);
        throw error;
      }
    });
  }

  getPromptCount(): number {
    return this.prompts.size;
  }
}

// Example Troubleshooting Prompt
class TroubleshootingPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'troubleshoot',
      description: 'Help troubleshoot Passgage API issues',
      arguments: [
        {
          name: 'error',
          description: 'The error message or issue description',
          required: true
        },
        {
          name: 'context',
          description: 'Additional context about when the error occurred',
          required: false
        }
      ]
    };
  }

  render(args: Record<string, string>): string {
    return `I'm experiencing an issue with the Passgage API:

Error: ${args.error}
${args.context ? `Context: ${args.context}` : ''}

Please help me:
1. understand what this error means
2. Identify the root cause
3. Provide steps to resolve it
4. Suggest preventive measures for the future`;
  }
}

// Example Onboarding Prompt
class OnboardingPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'onboard',
      description: 'Guide through Passgage API onboarding',
      arguments: [
        {
          name: 'company',
          description: 'Company name',
          required: true
        },
        {
          name: 'useCase',
          description: 'Primary use case for the API',
          required: false
        }
      ]
    };
  }

  render(args: Record<string, string>): string {
    return `Help me set up Passgage API for ${args.company}.

${args.useCase ? `Primary use case: ${args.useCase}` : ''}

Please guide me through:
1. Initial authentication setup
2. basic configuration
3. first API calls to verify everything works
4. best practices for our use case
5. Recommended next steps`;
  }
}

// Example API Explorer Prompt
class ApiExplorerPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'explore',
      description: 'Explore Passgage API capabilities',
      arguments: [
        {
          name: 'feature',
          description: 'Specific feature or area to explore',
          required: false
        }
      ]
    };
  }

  render(args: Record<string, string>): string {
    const feature = args.feature || 'all available features';
    
    return `I want to explore ${feature} in the Passgage API.

Please show me:
1. available endpoints and operations
2. common use cases and examples
3. required parameters and authentication
4. response formats and error handling
5. Any limitations or best practices I should know about`;
  }
}