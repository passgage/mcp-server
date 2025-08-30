import dotenv from 'dotenv';

dotenv.config();

export interface PassgageConfig {
  apiKey: string;
  baseURL: string;
  timeout: number;
  debug: boolean;
  userEmail?: string;
  userPassword?: string;
  defaultAuthMode: 'company' | 'user';
}

export const config: PassgageConfig = {
  apiKey: process.env.PASSGAGE_API_KEY ?? '',
  baseURL: process.env.PASSGAGE_BASE_URL ?? 'https://api.passgage.com',
  timeout: parseInt(process.env.PASSGAGE_TIMEOUT ?? '30000'),
  debug: process.env.PASSGAGE_DEBUG === 'true',
  userEmail: process.env.PASSGAGE_USER_EMAIL,
  userPassword: process.env.PASSGAGE_USER_PASSWORD,
  defaultAuthMode: (process.env.PASSGAGE_DEFAULT_AUTH_MODE as 'company' | 'user') ?? 'company'
};

export function validateConfig(): void {
  if (!config.apiKey && !config.userEmail) {
    throw new Error('Either PASSGAGE_API_KEY or PASSGAGE_USER_EMAIL must be provided');
  }
  
  if (config.userEmail && !config.userPassword) {
    throw new Error('PASSGAGE_USER_PASSWORD is required when using user authentication');
  }
  
  if (!config.baseURL) {
    throw new Error('PASSGAGE_BASE_URL must be provided');
  }

  if (config.defaultAuthMode && !['company', 'user'].includes(config.defaultAuthMode)) {
    throw new Error('PASSGAGE_DEFAULT_AUTH_MODE must be either "company" or "user"');
  }

  // Warn if default mode doesn't match available credentials
  if (config.defaultAuthMode === 'company' && !config.apiKey) {
    console.warn('Warning: Default auth mode is "company" but no API key provided');
  }
  
  if (config.defaultAuthMode === 'user' && !config.userEmail) {
    console.warn('Warning: Default auth mode is "user" but no user credentials provided');
  }
}