#!/usr/bin/env tsx
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
};
function success(message) {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
}
function info(message) {
    console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
}
function error(message) {
    console.error(`${colors.red}✗${colors.reset} ${message}`);
}
// Convert string to different case formats
function toPascalCase(str) {
    return str.replace(/(^|_)([a-z])/g, (_, __, letter) => letter.toUpperCase());
}
function toCamelCase(str) {
    const pascal = toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
function toKebabCase(str) {
    return str.replace(/_/g, '-');
}
// Tool template
function generateToolCode(config) {
    const imports = [
        "import { z } from 'zod';",
        "import { BaseTool } from '../base.tool.js';",
        "import { ToolMetadata } from '../index.js';"
    ];
    if (config.requiresAuth) {
        imports.push("import { PassgageAPIClient } from '../../api/client.js';");
    }
    const schemaFields = config.parameters.map(param => {
        let field = `  ${param.name}: z.${param.type}()`;
        if (!param.required)
            field += '.optional()';
        if (param.description)
            field += `.describe('${param.description}')`;
        return field;
    }).join(',\n');
    const constructorCode = config.requiresAuth
        ? `  constructor(apiClient: PassgageAPIClient) {\n    super(apiClient);\n  }`
        : '';
    return `${imports.join('\n')}

const ${config.name}Schema = z.object({
${schemaFields}
});

export class ${config.className}Tool extends BaseTool {
${constructorCode}

  getMetadata(): ToolMetadata {
    return {
      name: '${config.name}',
      description: '${config.description}',
      category: '${config.category}'${config.requiresAuth ? `,
      permissions: {
        companyMode: true,
        userMode: true
      }` : ''}
    };
  }

  getInputSchema(): z.ZodSchema {
    return ${config.name}Schema;
  }

  async execute(args: z.infer<typeof ${config.name}Schema>): Promise<any> {
    // Validate input
    const validated = ${config.name}Schema.parse(args);
    ${config.requiresAuth ? `
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }
` : ''}
    try {
      // TODO: Implement tool logic here
      ${config.requiresAuth ? `
      // Example API call:
      // const result = await this.apiClient.get('/api/endpoint', validated);
      ` : ''}
      return this.successResponse({
        message: 'Tool executed successfully',
        input: validated
      });
    } catch (error: any) {
      return this.errorResponse(error.message || 'Tool execution failed', error);
    }
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object',
        properties: {
${config.parameters.map(param => {
        const prop = [`          ${param.name}: {`,
            `            type: '${param.type === 'string' ? 'string' : param.type === 'number' ? 'number' : param.type === 'boolean' ? 'boolean' : 'object'}'`];
        if (param.description) {
            prop.push(`            description: '${param.description}'`);
        }
        prop.push('          }');
        return prop.join(',\n');
    }).join(',\n')}
        }${config.parameters.some(p => p.required) ? `,
        required: [${config.parameters.filter(p => p.required).map(p => `'${p.name}'`).join(', ')}]` : ''}
      }
    };
  }
}`;
}
// Main CLI
async function main() {
    const rl = readline.createInterface({ input, output });
    console.log(`${colors.bright}${colors.cyan}Create New MCP Tool${colors.reset}\n`);
    try {
        // Get tool name
        const name = await rl.question('Tool name (snake_case, e.g., get_user): ');
        if (!name || !/^[a-z_]+$/.test(name)) {
            throw new Error('Invalid tool name. Use snake_case (e.g., get_user)');
        }
        // Get description
        const description = await rl.question('Description: ');
        if (!description) {
            throw new Error('Description is required');
        }
        // Get category
        const category = await rl.question('Category (auth/crud/specialized/system) [crud]: ') || 'crud';
        // Check if requires auth
        const requiresAuthStr = await rl.question('Requires Passgage API client? (y/n) [y]: ') || 'y';
        const requiresAuth = requiresAuthStr.toLowerCase() === 'y';
        // Get parameters
        const parameters = [];
        const addParamsStr = await rl.question('Add parameters? (y/n) [y]: ') || 'y';
        if (addParamsStr.toLowerCase() === 'y') {
            console.log('\nAdd parameters (press Enter with empty name to finish):');
            while (true) {
                const paramName = await rl.question('  Parameter name (snake_case): ');
                if (!paramName)
                    break;
                const paramType = await rl.question('  Type (string/number/boolean/object) [string]: ') || 'string';
                const paramRequiredStr = await rl.question('  Required? (y/n) [y]: ') || 'y';
                const paramDesc = await rl.question('  Description: ');
                parameters.push({
                    name: paramName,
                    type: paramType,
                    required: paramRequiredStr.toLowerCase() === 'y',
                    description: paramDesc
                });
                console.log('');
            }
        }
        // Determine file location
        const isPassgageTool = requiresAuth || category === 'crud';
        const toolDir = isPassgageTool
            ? path.join(rootDir, 'src', 'tools', 'passgage')
            : path.join(rootDir, 'src', 'tools');
        const fileName = `${toKebabCase(name)}.tool.ts`;
        const filePath = path.join(toolDir, fileName);
        // Check if file already exists
        try {
            await fs.access(filePath);
            const overwrite = await rl.question(`\n${colors.yellow}File ${fileName} already exists. Overwrite? (y/n) [n]: ${colors.reset}`) || 'n';
            if (overwrite.toLowerCase() !== 'y') {
                info('Cancelled');
                process.exit(0);
            }
        }
        catch {
            // File doesn't exist, continue
        }
        // Generate code
        const className = toPascalCase(name);
        const code = generateToolCode({
            name: name.startsWith('passgage_') ? name : `passgage_${name}`,
            className,
            description,
            category,
            requiresAuth,
            parameters
        });
        // Ensure directory exists
        await fs.mkdir(toolDir, { recursive: true });
        // Write file
        await fs.writeFile(filePath, code, 'utf-8');
        success(`Created ${colors.bright}${fileName}${colors.reset}`);
        info(`Location: ${filePath}`);
        // Next steps
        console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
        console.log('1. Implement the execute() method in the generated file');
        console.log('2. The tool will be auto-discovered on server start');
        console.log('3. Test the tool using the MCP client');
        if (requiresAuth) {
            console.log(`\n${colors.yellow}Note:${colors.reset} This tool requires Passgage API authentication`);
        }
    }
    catch (err) {
        error(err.message);
        process.exit(1);
    }
    finally {
        rl.close();
    }
}
// Run if executed directly
if (import.meta.url === `file://${__filename}`) {
    main().catch(console.error);
}
//# sourceMappingURL=create-tool.js.map