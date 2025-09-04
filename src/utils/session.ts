import { AuthContext, AuthMode } from '../types/api.js';
import { logger } from '../config/logger.js';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

/**
 * Session-based authentication management for remote MCP deployments
 * Handles credential storage without exposing them in environment variables
 */
export interface SessionConfig {
  sessionTimeout: number; // in milliseconds
  autoRefresh: boolean;
  maxRetries: number;
  encryptionKey?: string; // For credential encryption
  kvStore?: {
    type: 'cloudflare' | 'redis' | 'memory';
    namespace?: string; // Cloudflare KV namespace
    client?: any; // Redis client or custom store
  };
  persistSessions: boolean;
}

// Cloudflare KV storage interface
export interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
}

export interface SessionData {
  id: string;
  userId?: string;
  companyId?: string;
  authMode: AuthMode;
  createdAt: Date;
  expiresAt: Date;
  lastUsed: Date;
  credentials?: {
    apiKey?: string;
    userEmail?: string;
    userPassword?: string; // encrypted
    jwtToken?: string;
    refreshToken?: string;
  };
}

/**
 * Session manager for secure credential handling in remote deployments
 * Supports memory and persistent storage (Cloudflare KV, Redis)
 */
export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private config: SessionConfig;
  private kvStore?: KVStore;
  private encryptionKey: string;
  // @ts-ignore - Used in constructor for cleanup interval
  private _cleanupInterval?: NodeJS.Timeout;
  private cloudflareEnv?: any; // For Cloudflare Workers environment

  constructor(config: Partial<SessionConfig> = {}, cloudflareEnv?: any) {
    this.config = {
      sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
      autoRefresh: true,
      maxRetries: 3,
      persistSessions: false,
      ...config
    };

    this.cloudflareEnv = cloudflareEnv;

    // Generate or use provided encryption key
    this.encryptionKey = config.encryptionKey || this.generateEncryptionKey();
    
    // Setup KV store if configured
    if (config.kvStore) {
      this.setupKVStore(config.kvStore);
    }

    // Cleanup expired sessions every hour (skip in Cloudflare Workers - handled by cron)
    const isCloudflareWorker = typeof globalThis !== 'undefined' && 
                               globalThis.Response && 
                               globalThis.Request;
    
    if (!isCloudflareWorker) {
      this._cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), 60 * 60 * 1000);
    }
    
    logger.info('SessionManager initialized', {
      timeout: this.config.sessionTimeout,
      persistSessions: this.config.persistSessions,
      kvStoreType: config.kvStore?.type || 'memory'
    });
  }

  /**
   * Setup KV store for session persistence
   */
  private setupKVStore(kvConfig: SessionConfig['kvStore']) {
    if (!kvConfig) return;

    try {
      switch (kvConfig.type) {
        case 'cloudflare':
          // In Cloudflare Workers environment, KV is available via environment
          if (this.cloudflareEnv?.PASSGAGE_SESSIONS) {
            this.kvStore = this.createCloudflareKVAdapter(this.cloudflareEnv.PASSGAGE_SESSIONS);
            logger.info('Cloudflare KV store connected via environment');
          } else if (typeof globalThis !== 'undefined' && (globalThis as any).PASSGAGE_SESSIONS) {
            this.kvStore = this.createCloudflareKVAdapter((globalThis as any).PASSGAGE_SESSIONS);
            logger.info('Cloudflare KV store connected via global');
          } else {
            logger.warn('Cloudflare KV store not available, falling back to memory');
          }
          break;
        case 'redis':
          if (kvConfig.client) {
            this.kvStore = this.createRedisAdapter(kvConfig.client);
            logger.info('Redis store connected');
          }
          break;
        default:
          logger.warn(`KV store type ${kvConfig.type} not supported, using memory`);
      }
    } catch (error) {
      logger.error('Failed to setup KV store:', error);
    }
  }

  /**
   * Create Redis adapter for KV interface
   */
  private createRedisAdapter(redisClient: any): KVStore {
    return {
      async get(key: string): Promise<string | null> {
        return redisClient.get(key);
      },
      async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
        if (options?.expirationTtl) {
          await redisClient.setex(key, Math.floor(options.expirationTtl / 1000), value);
        } else {
          await redisClient.set(key, value);
        }
      },
      async delete(key: string): Promise<void> {
        await redisClient.del(key);
      },
      async list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }> {
        const keys = await redisClient.keys(options?.prefix ? `${options.prefix}*` : '*');
        return { keys: keys.map((name: string) => ({ name })) };
      }
    };
  }

  /**
   * Create a new session with credentials
   */
  async createSession(credentials: {
    apiKey?: string;
    userEmail?: string;
    userPassword?: string;
    jwtToken?: string;
  }): Promise<string> {
    const sessionId = this.generateSecureSessionId();
    const now = new Date();
    const authMode: AuthMode = credentials.apiKey ? 'company' : 
                              credentials.userEmail ? 'user' : 'none';

    const session: SessionData = {
      id: sessionId,
      authMode,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.config.sessionTimeout),
      lastUsed: now,
      credentials: {
        apiKey: credentials.apiKey ? this.encrypt(credentials.apiKey) : undefined,
        userEmail: credentials.userEmail,
        userPassword: credentials.userPassword ? this.encrypt(credentials.userPassword) : undefined,
        jwtToken: credentials.jwtToken ? this.encrypt(credentials.jwtToken) : undefined
      }
    };

    // Store in memory
    this.sessions.set(sessionId, session);
    
    // Persist if configured
    if (this.config.persistSessions && this.kvStore) {
      await this.persistSession(session);
    }

    logger.debug('Session created', { sessionId, authMode, expiresAt: session.expiresAt });
    return sessionId;
  }

  /**
   * Get session data by ID (async to support KV store loading)
   */
  async getSession(sessionId: string): Promise<SessionData | undefined> {
    // Try memory first
    let session = this.sessions.get(sessionId);
    
    // If not in memory, try loading from KV store
    if (!session && this.config.persistSessions && this.kvStore) {
      session = await this.loadSession(sessionId);
      if (session) {
        // Cache in memory for faster access
        this.sessions.set(sessionId, session);
      }
    }

    if (!session) return undefined;

    // Check if expired
    if (new Date() > session.expiresAt) {
      await this.destroySession(sessionId);
      return undefined;
    }

    // Update last used
    session.lastUsed = new Date();
    
    // Persist updated session if configured
    if (this.config.persistSessions && this.kvStore) {
      await this.persistSession(session);
    }
    
    return session;
  }

  /**
   * Synchronous version for backward compatibility
   */
  getSessionSync(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    // Check if expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return undefined;
    }

    // Update last used
    session.lastUsed = new Date();
    return session;
  }

  /**
   * Update session with new JWT token
   */
  updateSessionToken(sessionId: string, jwtToken: string, refreshToken?: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (session.credentials) {
      session.credentials.jwtToken = jwtToken;
      session.credentials.refreshToken = refreshToken;
    }
    session.lastUsed = new Date();
    
    return true;
  }

  /**
   * Switch authentication mode within a session
   */
  switchMode(sessionId: string, newMode: AuthMode): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Validate if the session has credentials for the requested mode
    if (newMode === 'company' && !session.credentials?.apiKey) {
      return false;
    }
    if (newMode === 'user' && !session.credentials?.userEmail) {
      return false;
    }

    session.authMode = newMode;
    session.lastUsed = new Date();
    return true;
  }

  /**
   * Get authentication context for a session
   */
  async getAuthContext(sessionId: string): Promise<AuthContext | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    return {
      mode: session.authMode,
      companyApiKey: session.credentials?.apiKey,
      userJwtToken: session.credentials?.jwtToken,
      userInfo: undefined,
      tokenExpiresAt: undefined
    };
  }

  /**
   * Destroy a session
   */
  destroySession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get active sessions count (for monitoring)
   */
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  /**
   * Get decrypted credentials for a session
   */
  async getCredentials(sessionId: string): Promise<{
    apiKey?: string;
    userEmail?: string;
    userPassword?: string;
    jwtToken?: string;
  } | null> {
    const session = await this.getSession(sessionId);
    if (!session?.credentials) return null;

    return {
      apiKey: session.credentials.apiKey,
      userEmail: session.credentials.userEmail,
      userPassword: session.credentials.userPassword ? this.decrypt(session.credentials.userPassword) : undefined,
      jwtToken: session.credentials.jwtToken
    };
  }

  /**
   * Generate cryptographically secure session ID
   */
  private generateSecureSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = this.getRandomBytes(16);
    const hash = createHash('sha256').update(randomBytes + timestamp).digest('hex').slice(0, 16);
    return `sess_${timestamp}_${hash}`;
  }

  /**
   * Generate encryption key if not provided
   */
  private generateEncryptionKey(): string {
    return createHash('sha256').update(this.getRandomBytes(32)).digest('hex');
  }

  /**
   * Get cryptographically secure random bytes
   */
  private getRandomBytes(length: number): string {
    try {
      return randomBytes(length).toString('hex');
    } catch (error) {
      // Fallback for environments without crypto
      logger.warn('Crypto not available, using less secure random generation');
      return Array.from({ length: length * 2 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(value: string): string {
    try {
      // Use AES-256-CBC encryption
      const key = Buffer.from(this.encryptionKey, 'hex').slice(0, 32);
      const iv = randomBytes(16);
      const cipher = createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Prepend IV to encrypted data
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      // Fallback to base64 if crypto is not available
      logger.warn('Crypto encryption not available, using base64 encoding');
      return 'b64:' + Buffer.from(value).toString('base64');
    }
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(value: string): string {
    try {
      if (value.startsWith('b64:')) {
        // Base64 fallback
        return Buffer.from(value.slice(4), 'base64').toString();
      }

      const [ivHex, encrypted] = value.split(':');
      const key = Buffer.from(this.encryptionKey, 'hex').slice(0, 32);
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt value:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Persist session to KV store
   */
  private async persistSession(session: SessionData): Promise<void> {
    if (!this.kvStore) return;

    try {
      const sessionKey = `session:${session.id}`;
      const expirationTtl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
      
      await this.kvStore.put(
        sessionKey,
        JSON.stringify(session),
        { expirationTtl: Math.max(expirationTtl, 60) } // At least 1 minute
      );
      
      logger.debug('Session persisted to KV store', { sessionId: session.id });
    } catch (error) {
      logger.error('Failed to persist session:', error);
    }
  }

  /**
   * Load session from KV store
   */
  private async loadSession(sessionId: string): Promise<SessionData | undefined> {
    if (!this.kvStore) return undefined;

    try {
      const sessionKey = `session:${sessionId}`;
      const sessionData = await this.kvStore.get(sessionKey);
      
      if (!sessionData) return undefined;

      const session: SessionData = JSON.parse(sessionData);
      
      // Convert date strings back to Date objects
      session.createdAt = new Date(session.createdAt);
      session.expiresAt = new Date(session.expiresAt);
      session.lastUsed = new Date(session.lastUsed);
      
      return session;
    } catch (error) {
      logger.error('Failed to load session from KV store:', error);
      return undefined;
    }
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Create Cloudflare KV adapter for session storage
   */
  private createCloudflareKVAdapter(kv: any): KVStore {
    return {
      async put(key: string, value: string, options?: { expirationTtl?: number }) {
        const metadata = options?.expirationTtl ? { expirationTtl: options.expirationTtl } : undefined;
        return await kv.put(key, value, metadata);
      },

      async get(key: string): Promise<string | null> {
        return await kv.get(key, 'text');
      },

      async delete(key: string): Promise<void> {
        return await kv.delete(key);
      },

      async list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }> {
        const listOptions = options?.prefix ? { prefix: options.prefix } : {};
        const result = await kv.list(listOptions);
        // Convert to match KVStore interface
        return {
          keys: result.keys.map((key: any) => ({ name: key.name }))
        };
      }
    };
  }
}