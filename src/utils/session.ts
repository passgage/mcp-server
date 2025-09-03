import { AuthContext, AuthMode } from '../types/api.js';

/**
 * Session-based authentication management for remote MCP deployments
 * Handles credential storage without exposing them in environment variables
 */
export interface SessionConfig {
  sessionTimeout: number; // in milliseconds
  autoRefresh: boolean;
  maxRetries: number;
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
 */
export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private config: SessionConfig;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
      autoRefresh: true,
      maxRetries: 3,
      ...config
    };

    // Cleanup expired sessions every hour
    setInterval(() => this.cleanupExpiredSessions(), 60 * 60 * 1000);
  }

  /**
   * Create a new session with credentials
   */
  createSession(credentials: {
    apiKey?: string;
    userEmail?: string;
    userPassword?: string;
    jwtToken?: string;
  }): string {
    const sessionId = this.generateSessionId();
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
        apiKey: credentials.apiKey,
        userEmail: credentials.userEmail,
        userPassword: credentials.userPassword ? this.encrypt(credentials.userPassword) : undefined,
        jwtToken: credentials.jwtToken
      }
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Get session data by ID
   */
  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
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
  getAuthContext(sessionId: string): AuthContext | null {
    const session = this.getSession(sessionId);
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
  getCredentials(sessionId: string): {
    apiKey?: string;
    userEmail?: string;
    userPassword?: string;
    jwtToken?: string;
  } | null {
    const session = this.getSession(sessionId);
    if (!session?.credentials) return null;

    return {
      apiKey: session.credentials.apiKey,
      userEmail: session.credentials.userEmail,
      userPassword: session.credentials.userPassword ? this.decrypt(session.credentials.userPassword) : undefined,
      jwtToken: session.credentials.jwtToken
    };
  }

  private generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).substr(2) + Date.now().toString(36);
  }

  private encrypt(value: string): string {
    // Simple base64 encoding for demo - use proper encryption in production
    return Buffer.from(value).toString('base64');
  }

  private decrypt(value: string): string {
    // Simple base64 decoding for demo - use proper decryption in production
    return Buffer.from(value, 'base64').toString();
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
}

// Global session manager instance for remote deployments
export const sessionManager = new SessionManager();