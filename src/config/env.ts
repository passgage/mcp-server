import { z } from 'zod';
import * as dotenv from 'dotenv';
import { logger } from './logger.js';

// Load environment variables
dotenv.config();

// Define environment schema
const envSchema = z.object({
  // Authentication
  PASSGAGE_API_KEY: z.string().optional(),
  PASSGAGE_USER_EMAIL: z.string().email().optional(),
  PASSGAGE_USER_PASSWORD: z.string().optional(),
  
  // API Configuration
  PASSGAGE_BASE_URL: z.string().url().default('https://api.passgage.com'),
  PASSGAGE_TIMEOUT: z.string().transform(Number).default('30000'),
  PASSGAGE_DEBUG: z.string().transform(v => v === 'true').default('false'),
  
  // Deployment Mode Configuration
  MCP_DEPLOYMENT_MODE: z.enum(['local', 'global', 'auto']).default('auto'),
  MCP_GLOBAL_SESSION_STORAGE: z.enum(['memory', 'kv', 'redis']).default('memory'),
  MCP_SECURITY_ENABLED: z.string().transform(v => v === 'true').default('false'),
  
  // Transport Configuration
  TRANSPORT_TYPE: z.enum(['stdio', 'http', 'websocket']).default('stdio'),
  
  // HTTP Transport Options
  HTTP_PORT: z.string().transform(Number).optional().default('3000'),
  HTTP_HOST: z.string().optional().default('localhost'),
  HTTP_PATH: z.string().optional().default('/mcp'),
  HTTP_CORS: z.string().transform(v => v === 'true').optional().default('true'),
  
  // Global Mode - Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Global Mode - Session Management
  SESSION_TIMEOUT_HOURS: z.string().transform(Number).default('8'),
  ENCRYPTION_KEY: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
}).refine(
  (data) => {
    // Skip auth validation for global mode (users provide credentials via session)
    if (data.MCP_DEPLOYMENT_MODE === 'global') {
      return true;
    }
    
    // Ensure at least one auth method is configured for local mode
    const hasApiKey = !!data.PASSGAGE_API_KEY;
    const hasUserCreds = !!data.PASSGAGE_USER_EMAIL && !!data.PASSGAGE_USER_PASSWORD;
    
    if (!hasApiKey && !hasUserCreds) {
      logger.error('No authentication method configured');
      logger.info('Please set either:');
      logger.info('  - PASSGAGE_API_KEY for company-level access');
      logger.info('  - PASSGAGE_USER_EMAIL and PASSGAGE_USER_PASSWORD for user authentication');
      return false;
    }
    
    if (hasApiKey && hasUserCreds) {
      logger.warn('Both API key and user credentials configured. API key will take precedence.');
    }
    
    return true;
  },
  {
    message: 'At least one authentication method must be configured'
  }
);

// Parse and validate environment
let env: z.infer<typeof envSchema>;

// Check if we're in Cloudflare Workers environment
const isCloudflareWorker = typeof globalThis !== 'undefined' && 
                           typeof globalThis.Response !== 'undefined' && 
                           typeof globalThis.Request !== 'undefined' &&
                           typeof process === 'undefined';

if (isCloudflareWorker) {
  // For Cloudflare Workers, use minimal validation (full validation happens in worker.ts)
  env = {
    PASSGAGE_API_KEY: undefined,
    PASSGAGE_USER_EMAIL: undefined,
    PASSGAGE_USER_PASSWORD: undefined,
    PASSGAGE_BASE_URL: 'https://api.passgage.com',
    PASSGAGE_TIMEOUT: 30000,
    PASSGAGE_DEBUG: false,
    TRANSPORT_TYPE: 'http',
    MCP_DEPLOYMENT_MODE: 'global',
    MCP_GLOBAL_SESSION_STORAGE: 'kv',
    HTTP_PORT: 3000,
    HTTP_HOST: 'localhost',
    HTTP_PATH: '/mcp',
    HTTP_CORS: true,
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    SESSION_TIMEOUT_HOURS: 8,
    ENCRYPTION_KEY: undefined,
    MCP_SECURITY_ENABLED: true,
    LOG_LEVEL: 'info',
    LOG_FORMAT: 'json',
    NODE_ENV: 'production'
  };
} else {
  try {
    env = envSchema.parse(process.env);
    
    // Log configuration (without sensitive data)
    const configInfo = {
      baseUrl: env.PASSGAGE_BASE_URL,
      timeout: env.PASSGAGE_TIMEOUT,
      debug: env.PASSGAGE_DEBUG,
      transport: env.TRANSPORT_TYPE,
      nodeEnv: env.NODE_ENV,
      authMethod: env.PASSGAGE_API_KEY ? 'api-key' : 'user-credentials'
    };
    logger.info('Environment configuration loaded', configInfo);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Environment validation failed:');
      error.errors.forEach(err => {
        logger.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      logger.error('Failed to load environment:', { error });
    }
    process.exit(1);
  }
}

/**
 * Auto-detect deployment mode based on environment
 */
function detectDeploymentMode(): 'local' | 'global' {
  // Check for Cloudflare Workers environment
  if (typeof globalThis !== 'undefined' && (globalThis as any).Response && (globalThis as any).Request) {
    return 'global';
  }
  
  // Check for explicit global mode indicators
  if (process.env.CLOUDFLARE_WORKER === 'true' || 
      process.env.CF_PAGES === '1' ||
      process.env.MCP_DEPLOYMENT_MODE === 'global') {
    return 'global';
  }
  
  // Check for explicit local mode
  if (process.env.MCP_DEPLOYMENT_MODE === 'local') {
    return 'local';
  }
  
  // Default to local for traditional Node.js environments
  return 'local';
}

/**
 * Get effective configuration based on deployment mode
 */
function getEffectiveConfig(env: z.infer<typeof envSchema>) {
  const actualMode = env.MCP_DEPLOYMENT_MODE === 'auto' ? detectDeploymentMode() : env.MCP_DEPLOYMENT_MODE;
  
  // Apply mode-specific defaults
  const config = { ...env };
  
  if (actualMode === 'global') {
    // Global mode defaults
    config.TRANSPORT_TYPE = 'http';
    config.MCP_SECURITY_ENABLED = true;
    
    // Enable session storage if in global mode
    if (typeof globalThis !== 'undefined' && (globalThis as any).PASSGAGE_SESSIONS) {
      config.MCP_GLOBAL_SESSION_STORAGE = 'kv';
    }
  } else {
    // Local mode defaults
    config.TRANSPORT_TYPE = 'stdio';
    config.MCP_SECURITY_ENABLED = false;
    config.MCP_GLOBAL_SESSION_STORAGE = 'memory';
  }
  
  return {
    ...config,
    deploymentMode: actualMode
  };
}

// Get effective configuration
const effectiveEnv = getEffectiveConfig(env);

export { env, effectiveEnv };

// Export types
export type Environment = z.infer<typeof envSchema>;
export type DeploymentMode = 'local' | 'global';
export type EffectiveEnvironment = Environment & { deploymentMode: DeploymentMode };