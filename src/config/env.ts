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
  
  // Transport Configuration
  TRANSPORT_TYPE: z.enum(['stdio', 'http', 'websocket']).default('stdio'),
  
  // HTTP Transport Options (for future use)
  HTTP_PORT: z.string().transform(Number).optional().default('3000'),
  HTTP_HOST: z.string().optional().default('localhost'),
  HTTP_PATH: z.string().optional().default('/mcp'),
  HTTP_CORS: z.string().transform(v => v === 'true').optional().default('true'),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
}).refine(
  (data) => {
    // Ensure at least one auth method is configured
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

export { env };

// Export type for use in other files
export type Environment = z.infer<typeof envSchema>;