import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  PromptRegistry, 
  BasePrompt, 
  PromptMetadata 
} from '../../src/prompts/index.js';
import { jest } from '@jest/globals';

// Mock logger silently
jest.mock('../../src/config/logger.js', () => ({
  logger: {
    info: jest.fn(() => {}),
    warn: jest.fn(() => {}),
    error: jest.fn(() => {}),
    debug: jest.fn(() => {})
  }
}));

describe('MCP Prompts System', () => {
  let server: Server;
  let registry: PromptRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock MCP server
    server = {
      setRequestHandler: jest.fn()
    } as any;

    registry = new PromptRegistry(server);
  });

  describe('BasePrompt Abstract Class', () => {
    class TestPrompt extends BasePrompt {
      getMetadata(): PromptMetadata {
        return {
          name: 'test-prompt',
          description: 'A test prompt for unit testing',
          arguments: [
            {
              name: 'input',
              description: 'Test input parameter',
              required: true
            },
            {
              name: 'optional',
              description: 'Optional test parameter',
              required: false
            }
          ]
        };
      }

      render(args: Record<string, string>): string {
        return `Test prompt with input: ${args.input}${args.optional ? ` and optional: ${args.optional}` : ''}`;
      }
    }

    it('should convert to MCP prompt format', () => {
      const prompt = new TestPrompt();
      const mcpPrompt = prompt.toMCPPrompt();

      expect(mcpPrompt).toEqual({
        name: 'test-prompt',
        description: 'A test prompt for unit testing',
        arguments: [
          {
            name: 'input',
            description: 'Test input parameter',
            required: true
          },
          {
            name: 'optional',
            description: 'Optional test parameter',
            required: false
          }
        ]
      });
    });

    it('should handle minimal metadata', () => {
      class MinimalPrompt extends BasePrompt {
        getMetadata(): PromptMetadata {
          return {
            name: 'minimal-prompt'
          };
        }

        render(args: Record<string, string>): string {
          return 'Minimal prompt content';
        }
      }

      const prompt = new MinimalPrompt();
      const mcpPrompt = prompt.toMCPPrompt();

      expect(mcpPrompt).toEqual({
        name: 'minimal-prompt',
        description: undefined,
        arguments: undefined
      });
    });

    it('should render prompt with arguments', () => {
      const prompt = new TestPrompt();
      const rendered = prompt.render({ input: 'test-value', optional: 'optional-value' });

      expect(rendered).toBe('Test prompt with input: test-value and optional: optional-value');
    });

    it('should render prompt without optional arguments', () => {
      const prompt = new TestPrompt();
      const rendered = prompt.render({ input: 'test-value' });

      expect(rendered).toBe('Test prompt with input: test-value');
    });
  });

  describe('PromptRegistry', () => {
    it('should initialize with server', () => {
      expect(registry['server']).toBe(server);
      expect(registry['prompts']).toBeInstanceOf(Map);
      expect(registry.getPromptCount()).toBe(0);
    });

    it('should register prompts correctly', () => {
      class CustomPrompt extends BasePrompt {
        getMetadata(): PromptMetadata {
          return {
            name: 'custom-prompt',
            description: 'Custom test prompt'
          };
        }

        render(args: Record<string, string>): string {
          return 'Custom prompt content';
        }
      }

      const prompt = new CustomPrompt();
      registry.registerPrompt(prompt);

      expect(registry.getPromptCount()).toBe(1);
      expect(registry['prompts'].has('custom-prompt')).toBe(true);
    });

    it('should register multiple prompts', () => {
      const prompts = [
        { name: 'prompt1', description: 'First prompt' },
        { name: 'prompt2', description: 'Second prompt' },
        { name: 'prompt3', description: 'Third prompt' }
      ];

      prompts.forEach((metadata) => {
        class TestPrompt extends BasePrompt {
          getMetadata(): PromptMetadata {
            return metadata;
          }

          render(args: Record<string, string>): string {
            return `${metadata.name} content`;
          }
        }

        registry.registerPrompt(new TestPrompt());
      });

      expect(registry.getPromptCount()).toBe(3);
    });

    it('should setup MCP handlers during registration', async () => {
      await registry.registerAll();

      expect(server.setRequestHandler).toHaveBeenCalledTimes(2);
      expect(server.setRequestHandler).toHaveBeenCalledWith(
        expect.any(Object), // ListPromptsRequestSchema
        expect.any(Function)
      );
      expect(server.setRequestHandler).toHaveBeenCalledWith(
        expect.any(Object), // GetPromptRequestSchema
        expect.any(Function)
      );
    });

    it('should register all built-in prompts', async () => {
      expect(registry.getPromptCount()).toBe(0);

      await registry.registerAll();

      expect(registry.getPromptCount()).toBe(3); // troubleshoot, onboard, explore
      expect(registry['prompts'].has('troubleshoot')).toBe(true);
      expect(registry['prompts'].has('onboard')).toBe(true);
      expect(registry['prompts'].has('explore')).toBe(true);
    });
  });

  describe('List Prompts Handler', () => {
    let listPromptsHandler: any;

    beforeEach(async () => {
      await registry.registerAll();
      
      // Extract the handler function
      const calls = (server.setRequestHandler as jest.Mock).mock.calls;
      const listCall = calls.find(call => 
        call[0].method === 'prompts/list' || 
        typeof call[1] === 'function'
      );
      listPromptsHandler = listCall ? listCall[1] : calls[0][1];
    });

    it('should list all registered prompts', async () => {
      const result = await listPromptsHandler();

      expect(result).toHaveProperty('prompts');
      expect(Array.isArray(result.prompts)).toBe(true);
      expect(result.prompts.length).toBe(3); // troubleshoot, onboard, explore
    });

    it('should return prompts in correct MCP format', async () => {
      const result = await listPromptsHandler();

      result.prompts.forEach((prompt: any) => {
        expect(prompt).toHaveProperty('name');
        expect(prompt).toHaveProperty('description');
        expect(typeof prompt.name).toBe('string');
        expect(typeof prompt.description).toBe('string');
      });
    });

    it('should include built-in prompts', async () => {
      const result = await listPromptsHandler();

      const promptNames = result.prompts.map((p: any) => p.name);
      expect(promptNames).toContain('troubleshoot');
      expect(promptNames).toContain('onboard');
      expect(promptNames).toContain('explore');
    });
  });

  describe('Get Prompt Handler', () => {
    let getPromptHandler: any;

    beforeEach(async () => {
      await registry.registerAll();
      
      // Extract the handler function
      const calls = (server.setRequestHandler as jest.Mock).mock.calls;
      const getCall = calls.find(call => call[1] && call[1].toString().includes('name'));
      getPromptHandler = getCall ? getCall[1] : calls[1][1];
    });

    it('should render existing prompt without arguments', async () => {
      const request = {
        params: { 
          name: 'explore',
          arguments: {}
        }
      };

      const result = await getPromptHandler(request);

      expect(result).toHaveProperty('messages');
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages).toHaveLength(1);

      const message = result.messages[0];
      expect(message).toHaveProperty('role', 'user');
      expect(message).toHaveProperty('content');
      expect(message.content).toHaveProperty('type', 'text');
      expect(message.content).toHaveProperty('text');
      expect(typeof message.content.text).toBe('string');
    });

    it('should render existing prompt with arguments', async () => {
      const request = {
        params: { 
          name: 'troubleshoot',
          arguments: {
            error: 'API timeout',
            context: 'During user creation'
          }
        }
      };

      const result = await getPromptHandler(request);

      const message = result.messages[0];
      expect(message.content.text).toContain('API timeout');
      expect(message.content.text).toContain('During user creation');
    });

    it('should handle missing optional arguments', async () => {
      const request = {
        params: { 
          name: 'onboard',
          arguments: {
            company: 'Test Corp'
          }
        }
      };

      const result = await getPromptHandler(request);

      const message = result.messages[0];
      expect(message.content.text).toContain('Test Corp');
      expect(message.content.text).not.toContain('Primary use case: undefined');
    });

    it('should throw error for unknown prompt', async () => {
      const request = {
        params: { 
          name: 'unknown-prompt',
          arguments: {}
        }
      };

      await expect(getPromptHandler(request)).rejects.toThrow('Unknown prompt: unknown-prompt');
    });

    it('should handle prompt rendering errors', async () => {
      // Register a prompt that throws an error
      class ErrorPrompt extends BasePrompt {
        getMetadata(): PromptMetadata {
          return {
            name: 'error-prompt',
            description: 'Prompt that throws errors'
          };
        }

        render(args: Record<string, string>): string {
          throw new Error('Rendering failed');
        }
      }

      registry.registerPrompt(new ErrorPrompt());

      const request = {
        params: { 
          name: 'error-prompt',
          arguments: {}
        }
      };

      await expect(getPromptHandler(request)).rejects.toThrow('Rendering failed');
    });

    it('should handle null arguments parameter', async () => {
      const request = {
        params: { 
          name: 'explore',
          arguments: null
        }
      };

      const result = await getPromptHandler(request);

      expect(result.messages[0].content.text).toContain('all available features');
    });
  });

  describe('Built-in Prompts', () => {
    beforeEach(async () => {
      await registry.registerAll();
    });

    describe('TroubleshootingPrompt', () => {
      let troubleshootPrompt: any;

      beforeEach(() => {
        troubleshootPrompt = registry['prompts'].get('troubleshoot');
      });

      it('should have correct metadata', () => {
        const metadata = troubleshootPrompt.getMetadata();

        expect(metadata.name).toBe('troubleshoot');
        expect(metadata.description).toContain('troubleshoot Passgage API issues');
        expect(metadata.arguments).toHaveLength(2);
        
        expect(metadata.arguments[0].name).toBe('error');
        expect(metadata.arguments[0].required).toBe(true);
        
        expect(metadata.arguments[1].name).toBe('context');
        expect(metadata.arguments[1].required).toBe(false);
      });

      it('should render troubleshooting prompt with error and context', () => {
        const rendered = troubleshootPrompt.render({
          error: 'Connection timeout',
          context: 'During bulk data import'
        });

        expect(rendered).toContain('Connection timeout');
        expect(rendered).toContain('During bulk data import');
        expect(rendered).toContain('understand what this error means');
        expect(rendered).toContain('root cause');
        expect(rendered).toContain('steps to resolve');
        expect(rendered).toContain('preventive measures');
      });

      it('should render troubleshooting prompt without context', () => {
        const rendered = troubleshootPrompt.render({
          error: 'Invalid API key'
        });

        expect(rendered).toContain('Invalid API key');
        expect(rendered).not.toContain('Context:');
      });
    });

    describe('OnboardingPrompt', () => {
      let onboardPrompt: any;

      beforeEach(() => {
        onboardPrompt = registry['prompts'].get('onboard');
      });

      it('should have correct metadata', () => {
        const metadata = onboardPrompt.getMetadata();

        expect(metadata.name).toBe('onboard');
        expect(metadata.description).toContain('Guide through Passgage API onboarding');
        expect(metadata.arguments).toHaveLength(2);
        
        expect(metadata.arguments[0].name).toBe('company');
        expect(metadata.arguments[0].required).toBe(true);
        
        expect(metadata.arguments[1].name).toBe('useCase');
        expect(metadata.arguments[1].required).toBe(false);
      });

      it('should render onboarding prompt with company and use case', () => {
        const rendered = onboardPrompt.render({
          company: 'Acme Corp',
          useCase: 'Time tracking integration'
        });

        expect(rendered).toContain('Acme Corp');
        expect(rendered).toContain('Time tracking integration');
        expect(rendered).toContain('authentication setup');
        expect(rendered).toContain('basic configuration');
        expect(rendered).toContain('first API calls');
        expect(rendered).toContain('best practices');
      });

      it('should render onboarding prompt without use case', () => {
        const rendered = onboardPrompt.render({
          company: 'Test Company'
        });

        expect(rendered).toContain('Test Company');
        expect(rendered).not.toContain('Primary use case:');
      });
    });

    describe('ApiExplorerPrompt', () => {
      let explorerPrompt: any;

      beforeEach(() => {
        explorerPrompt = registry['prompts'].get('explore');
      });

      it('should have correct metadata', () => {
        const metadata = explorerPrompt.getMetadata();

        expect(metadata.name).toBe('explore');
        expect(metadata.description).toContain('Explore Passgage API capabilities');
        expect(metadata.arguments).toHaveLength(1);
        
        expect(metadata.arguments[0].name).toBe('feature');
        expect(metadata.arguments[0].required).toBe(false);
      });

      it('should render exploration prompt with specific feature', () => {
        const rendered = explorerPrompt.render({
          feature: 'user management'
        });

        expect(rendered).toContain('user management');
        expect(rendered).toContain('available endpoints');
        expect(rendered).toContain('common use cases');
        expect(rendered).toContain('required parameters');
        expect(rendered).toContain('response formats');
        expect(rendered).toContain('limitations or best practices');
      });

      it('should render exploration prompt without specific feature', () => {
        const rendered = explorerPrompt.render({});

        expect(rendered).toContain('all available features');
      });
    });
  });

  describe('Custom Prompt Integration', () => {
    it('should support custom prompt with complex arguments', () => {
      class ComplexPrompt extends BasePrompt {
        getMetadata(): PromptMetadata {
          return {
            name: 'complex-prompt',
            description: 'Complex prompt with multiple arguments',
            arguments: [
              { name: 'action', description: 'Action to perform', required: true },
              { name: 'target', description: 'Target resource', required: true },
              { name: 'filters', description: 'JSON filters', required: false },
              { name: 'format', description: 'Output format', required: false }
            ]
          };
        }

        render(args: Record<string, string>): string {
          const { action, target, filters, format } = args;
          
          let prompt = `Please ${action} ${target}`;
          
          if (filters) {
            prompt += ` with filters: ${filters}`;
          }
          
          if (format) {
            prompt += ` in ${format} format`;
          }
          
          return prompt;
        }
      }

      const complexPrompt = new ComplexPrompt();
      registry.registerPrompt(complexPrompt);

      expect(registry.getPromptCount()).toBe(1);

      const rendered = complexPrompt.render({
        action: 'retrieve',
        target: 'users',
        filters: '{"active": true}',
        format: 'CSV'
      });

      expect(rendered).toBe('Please retrieve users with filters: {"active": true} in CSV format');
    });

    it('should support dynamic prompt rendering', () => {
      class DynamicPrompt extends BasePrompt {
        getMetadata(): PromptMetadata {
          return {
            name: 'dynamic-prompt',
            description: 'Dynamically generated prompt',
            arguments: [
              { name: 'template', description: 'Prompt template', required: true },
              { name: 'variables', description: 'JSON variables', required: false }
            ]
          };
        }

        render(args: Record<string, string>): string {
          let template = args.template;
          
          if (args.variables) {
            try {
              const vars = JSON.parse(args.variables);
              Object.entries(vars).forEach(([key, value]) => {
                template = template.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
              });
            } catch (error) {
              // Ignore JSON parsing errors
            }
          }
          
          return template;
        }
      }

      const dynamicPrompt = new DynamicPrompt();
      registry.registerPrompt(dynamicPrompt);

      const rendered = dynamicPrompt.render({
        template: 'Hello {{name}}, welcome to {{company}}!',
        variables: '{"name": "John", "company": "Acme Corp"}'
      });

      expect(rendered).toBe('Hello John, welcome to Acme Corp!');
    });
  });

  describe('Error Handling', () => {
    it('should handle prompt registration errors gracefully', async () => {
      const mockLogger = (await import('../../src/config/logger.js')).logger;

      class FaultyPrompt extends BasePrompt {
        getMetadata(): PromptMetadata {
          throw new Error('Metadata error');
        }

        render(args: Record<string, string>): string {
          return 'content';
        }
      }

      expect(() => {
        registry.registerPrompt(new FaultyPrompt());
      }).toThrow('Metadata error');
    });

    it('should handle duplicate prompt names', () => {
      class DuplicatePrompt extends BasePrompt {
        getMetadata(): PromptMetadata {
          return {
            name: 'duplicate-name',
            description: 'First prompt'
          };
        }

        render(args: Record<string, string>): string {
          return 'First prompt content';
        }
      }

      class AnotherDuplicatePrompt extends BasePrompt {
        getMetadata(): PromptMetadata {
          return {
            name: 'duplicate-name',
            description: 'Second prompt'
          };
        }

        render(args: Record<string, string>): string {
          return 'Second prompt content';
        }
      }

      const prompt1 = new DuplicatePrompt();
      const prompt2 = new AnotherDuplicatePrompt();

      registry.registerPrompt(prompt1);
      registry.registerPrompt(prompt2); // Should overwrite the first

      expect(registry.getPromptCount()).toBe(1);
      
      const registeredPrompt = registry['prompts'].get('duplicate-name');
      expect(registeredPrompt.render({})).toBe('Second prompt content');
    });
  });

  describe('Prompt Argument Validation', () => {
    it('should handle missing required arguments gracefully', async () => {
      class StrictPrompt extends BasePrompt {
        getMetadata(): PromptMetadata {
          return {
            name: 'strict-prompt',
            description: 'Prompt with required arguments',
            arguments: [
              { name: 'required', description: 'Required param', required: true }
            ]
          };
        }

        render(args: Record<string, string>): string {
          if (!args.required) {
            throw new Error('Required argument missing');
          }
          return `Content with ${args.required}`;
        }
      }

      registry.registerPrompt(new StrictPrompt());
      await registry.registerAll();

      const calls = (server.setRequestHandler as jest.Mock).mock.calls;
      const getCall = calls.find(call => call[1] && call[1].toString().includes('name'));
      const getPromptHandler = getCall[1];

      const request = {
        params: { 
          name: 'strict-prompt',
          arguments: {}
        }
      };

      await expect(getPromptHandler(request)).rejects.toThrow('Required argument missing');
    });
  });
});