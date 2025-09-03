#!/usr/bin/env tsx

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}[dev]${colors.reset} ${message}`);
}

function error(message: string) {
  console.error(`${colors.red}[dev] ✗ ${message}${colors.reset}`);
}

function success(message: string) {
  console.log(`${colors.green}[dev] ✓ ${message}${colors.reset}`);
}

function info(message: string) {
  console.log(`${colors.cyan}[dev] ℹ ${message}${colors.reset}`);
}

// Check if .env file exists
const envPath = path.join(rootDir, '.env');
if (!fs.existsSync(envPath)) {
  error('.env file not found!');
  info('Creating .env from .env.example...');
  
  const examplePath = path.join(rootDir, '.env.example');
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    success('.env file created. Please update it with your credentials.');
  } else {
    error('.env.example not found either. Please create .env manually.');
    process.exit(1);
  }
}

// Check required environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: envPath });

const hasApiKey = !!process.env.PASSGAGE_API_KEY;
const hasUserCreds = !!process.env.PASSGAGE_USER_EMAIL && !!process.env.PASSGAGE_USER_PASSWORD;

if (!hasApiKey && !hasUserCreds) {
  error('No authentication configured in .env file!');
  info('Please set either:');
  info('  - PASSGAGE_API_KEY for company-level access');
  info('  - PASSGAGE_USER_EMAIL and PASSGAGE_USER_PASSWORD for user authentication');
  process.exit(1);
}

// Development server options
const args = process.argv.slice(2);
const watchMode = !args.includes('--no-watch');
const debugMode = args.includes('--debug') || process.env.PASSGAGE_DEBUG === 'true';
const transportType = process.env.TRANSPORT_TYPE || 'stdio';

log(`Starting Passgage MCP Server in development mode...`);
info(`Transport: ${transportType}`);
info(`Watch mode: ${watchMode ? 'enabled' : 'disabled'}`);
info(`Debug mode: ${debugMode ? 'enabled' : 'disabled'}`);
info(`Auth mode: ${hasApiKey ? 'API Key' : 'User Credentials'}`);

// Set development environment
process.env.NODE_ENV = 'development';
process.env.LOG_FORMAT = 'pretty';
if (debugMode) {
  process.env.LOG_LEVEL = 'debug';
  process.env.PASSGAGE_DEBUG = 'true';
}

// Command to run
const command = 'tsx';
const commandArgs = [
  watchMode ? '--watch' : '',
  path.join(rootDir, 'src', 'main.ts')
].filter(Boolean);

// Start the server
const server = spawn(command, commandArgs, {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    FORCE_COLOR: '1'
  }
});

// Handle exit
server.on('close', (code) => {
  if (code === 0) {
    success('Server stopped');
  } else {
    error(`Server exited with code ${code}`);
  }
  process.exit(code || 0);
});

// Handle errors
server.on('error', (err) => {
  error(`Failed to start server: ${err.message}`);
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  info('Shutting down...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  info('Shutting down...');
  server.kill('SIGTERM');
});

success('Development server started!');

// If stdio transport, provide connection instructions
if (transportType === 'stdio') {
  console.log('');
  info('To connect with Claude Desktop, add this to your config:');
  console.log(`
{
  "mcpServers": {
    "passgage-dev": {
      "command": "tsx",
      "args": ["${path.join(rootDir, 'src', 'main.ts')}"],
      "env": {
        "PASSGAGE_API_KEY": "${process.env.PASSGAGE_API_KEY || 'your-api-key'}"
      }
    }
  }
}
`);
}