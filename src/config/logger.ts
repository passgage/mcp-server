// Simple console logger implementation
// Will be replaced with pino in production

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'production';

const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = logLevels[logLevel as keyof typeof logLevels] || 1;

interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  child: (context: any) => Logger;
}

function formatMessage(level: string, message: string, args: any[]): string {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.length > 0 ? ' ' + JSON.stringify(args[0]) : '';
  
  if (nodeEnv === 'development') {
    // Pretty format for development
    const colors: Record<string, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m'  // red
    };
    const reset = '\x1b[0m';
    const color = colors[level] || reset;
    
    return `${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}${formattedArgs}`;
  }
  
  // JSON format for production
  const log = {
    timestamp,
    level,
    message,
    ...(args.length > 0 ? { data: args[0] } : {})
  };
  
  return JSON.stringify(log);
}

export const logger: Logger = {
  debug: (message: string, ...args: any[]) => {
    if (currentLevel <= logLevels.debug) {
      console.log(formatMessage('debug', message, args));
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (currentLevel <= logLevels.info) {
      console.log(formatMessage('info', message, args));
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (currentLevel <= logLevels.warn) {
      console.warn(formatMessage('warn', message, args));
    }
  },
  
  error: (message: string, ...args: any[]) => {
    if (currentLevel <= logLevels.error) {
      console.error(formatMessage('error', message, args));
    }
  },
  
  child: (context: any): Logger => {
    // For now, just return the same logger
    // In production, this would create a child logger with context
    console.log('Logger context:', context); // TODO: Use context in production
    return logger;
  }
};

export const createLogger = (module: string): Logger => {
  return logger.child({ module });
};