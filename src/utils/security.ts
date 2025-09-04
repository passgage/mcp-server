import { logger } from '../config/logger.js';
import { createHash } from 'crypto';

export interface SecurityConfig {
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  };
  bruteForce: {
    freeRetries: number;
    minWait: number; // milliseconds
    maxWait: number; // milliseconds
    lifetime: number; // milliseconds
  };
  session: {
    maxSessions: number;
    maxSessionsPerUser: number;
    suspiciousThreshold: number;
  };
  monitoring: {
    alertOnHighFailureRate: boolean;
    failureRateThreshold: number; // percentage
    alertOnSuspiciousActivity: boolean;
  };
}

export interface SecurityEvent {
  type: 'rate_limit' | 'brute_force' | 'suspicious_activity' | 'auth_failure';
  clientId: string;
  timestamp: Date;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ClientInfo {
  id: string;
  ipAddress?: string;
  userAgent?: string;
  requests: Array<{
    timestamp: Date;
    endpoint: string;
    success: boolean;
    sessionId?: string;
  }>;
  failedAttempts: number;
  lastFailedAttempt?: Date;
  blocked: boolean;
  blockExpiry?: Date;
  riskScore: number;
}

/**
 * Security manager for global MCP server
 * Handles rate limiting, abuse detection, and monitoring
 */
export class SecurityManager {
  private config: SecurityConfig;
  private clients = new Map<string, ClientInfo>();
  private events: SecurityEvent[] = [];
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      rateLimit: {
        windowMs: 60000, // 1 minute
        maxRequests: 100,
        ...config.rateLimit
      },
      bruteForce: {
        freeRetries: 5,
        minWait: 10000, // 10 seconds
        maxWait: 300000, // 5 minutes
        lifetime: 3600000, // 1 hour
        ...config.bruteForce
      },
      session: {
        maxSessions: 10000,
        maxSessionsPerUser: 5,
        suspiciousThreshold: 50, // requests per minute
        ...config.session
      },
      monitoring: {
        alertOnHighFailureRate: true,
        failureRateThreshold: 25, // 25% failure rate
        alertOnSuspiciousActivity: true,
        ...config.monitoring
      }
    };

    // Cleanup old data every 15 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 15 * 60 * 1000);
    
    logger.info('SecurityManager initialized', {
      rateLimitWindow: this.config.rateLimit.windowMs,
      maxRequests: this.config.rateLimit.maxRequests,
      bruteForceProtection: true
    });
  }

  /**
   * Get or create client info
   */
  private getClient(clientId: string, ipAddress?: string, userAgent?: string): ClientInfo {
    let client = this.clients.get(clientId);
    
    if (!client) {
      client = {
        id: clientId,
        ipAddress,
        userAgent,
        requests: [],
        failedAttempts: 0,
        blocked: false,
        riskScore: 0
      };
      this.clients.set(clientId, client);
    }

    return client;
  }

  /**
   * Check rate limiting for a client
   */
  checkRateLimit(clientId: string, ipAddress?: string, userAgent?: string): {
    allowed: boolean;
    resetTime: number;
    remaining: number;
  } {
    const client = this.getClient(clientId, ipAddress, userAgent);
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.rateLimit.windowMs);

    // Remove old requests outside the window
    client.requests = client.requests.filter(req => req.timestamp > windowStart);

    // Check if blocked for brute force
    if (client.blocked && client.blockExpiry && now < client.blockExpiry) {
      this.recordEvent({
        type: 'rate_limit',
        clientId,
        timestamp: now,
        details: { reason: 'blocked_for_brute_force', blockExpiry: client.blockExpiry },
        severity: 'medium'
      });

      return {
        allowed: false,
        resetTime: client.blockExpiry.getTime(),
        remaining: 0
      };
    }

    // Count current requests in window
    const requestCount = client.requests.length;
    const remaining = Math.max(0, this.config.rateLimit.maxRequests - requestCount - 1);

    if (requestCount >= this.config.rateLimit.maxRequests) {
      this.recordEvent({
        type: 'rate_limit',
        clientId,
        timestamp: now,
        details: { requestCount, limit: this.config.rateLimit.maxRequests },
        severity: 'low'
      });

      return {
        allowed: false,
        resetTime: now.getTime() + this.config.rateLimit.windowMs,
        remaining: 0
      };
    }

    return {
      allowed: true,
      resetTime: now.getTime() + this.config.rateLimit.windowMs,
      remaining
    };
  }

  /**
   * Record a request attempt
   */
  recordRequest(
    clientId: string,
    endpoint: string,
    success: boolean,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string
  ): void {
    const client = this.getClient(clientId, ipAddress, userAgent);
    const now = new Date();

    // Record request
    client.requests.push({
      timestamp: now,
      endpoint,
      success,
      sessionId
    });

    // Handle failed requests
    if (!success) {
      client.failedAttempts++;
      client.lastFailedAttempt = now;

      // Check for brute force pattern
      const recentFailures = client.requests.filter(
        req => !req.success && req.timestamp > new Date(now.getTime() - this.config.bruteForce.lifetime)
      ).length;

      if (recentFailures > this.config.bruteForce.freeRetries) {
        this.blockClient(clientId, recentFailures);
      }
    } else {
      // Reset failed attempts on success
      if (client.failedAttempts > 0) {
        client.failedAttempts = Math.max(0, client.failedAttempts - 1);
      }
    }

    // Calculate risk score
    this.updateRiskScore(clientId);

    // Monitor for suspicious activity
    this.monitorSuspiciousActivity(clientId);
  }

  /**
   * Block client for brute force protection
   */
  private blockClient(clientId: string, failureCount: number): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Calculate exponential backoff
    const waitTime = Math.min(
      this.config.bruteForce.minWait * Math.pow(2, failureCount - this.config.bruteForce.freeRetries),
      this.config.bruteForce.maxWait
    );

    client.blocked = true;
    client.blockExpiry = new Date(Date.now() + waitTime);

    this.recordEvent({
      type: 'brute_force',
      clientId,
      timestamp: new Date(),
      details: {
        failureCount,
        waitTime,
        blockExpiry: client.blockExpiry
      },
      severity: 'high'
    });

    logger.warn('Client blocked for brute force attempts', {
      clientId,
      failureCount,
      waitTime,
      blockExpiry: client.blockExpiry
    });
  }

  /**
   * Update client risk score
   */
  private updateRiskScore(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const now = new Date();
    const recentWindow = new Date(now.getTime() - 300000); // 5 minutes
    const recentRequests = client.requests.filter(req => req.timestamp > recentWindow);
    
    let riskScore = 0;

    // High request frequency
    if (recentRequests.length > this.config.session.suspiciousThreshold) {
      riskScore += 30;
    }

    // High failure rate
    const failureRate = recentRequests.length > 0 ? 
      (recentRequests.filter(req => !req.success).length / recentRequests.length) * 100 : 0;
    
    if (failureRate > this.config.monitoring.failureRateThreshold) {
      riskScore += 25;
    }

    // Multiple sessions
    const uniqueSessions = new Set(recentRequests.map(req => req.sessionId).filter(Boolean));
    if (uniqueSessions.size > this.config.session.maxSessionsPerUser) {
      riskScore += 20;
    }

    // Consistent failures
    if (client.failedAttempts > 10) {
      riskScore += 15;
    }

    // Pattern detection - rapid endpoint scanning
    const uniqueEndpoints = new Set(recentRequests.map(req => req.endpoint));
    if (uniqueEndpoints.size > 20 && recentRequests.length > 50) {
      riskScore += 35; // Likely scanning
    }

    client.riskScore = riskScore;

    // Alert on high risk
    if (riskScore > 70 && this.config.monitoring.alertOnSuspiciousActivity) {
      this.recordEvent({
        type: 'suspicious_activity',
        clientId,
        timestamp: now,
        details: {
          riskScore,
          recentRequests: recentRequests.length,
          failureRate,
          uniqueSessions: uniqueSessions.size,
          uniqueEndpoints: uniqueEndpoints.size
        },
        severity: 'high'
      });
    }
  }

  /**
   * Monitor for suspicious activity patterns
   */
  private monitorSuspiciousActivity(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client || !this.config.monitoring.alertOnSuspiciousActivity) return;

    const now = new Date();
    const recentWindow = new Date(now.getTime() - 60000); // 1 minute
    const recentRequests = client.requests.filter(req => req.timestamp > recentWindow);

    // Detect rapid-fire requests (potential DoS)
    if (recentRequests.length > this.config.session.suspiciousThreshold) {
      this.recordEvent({
        type: 'suspicious_activity',
        clientId,
        timestamp: now,
        details: {
          pattern: 'rapid_requests',
          requestCount: recentRequests.length,
          window: '1_minute'
        },
        severity: 'medium'
      });
    }

    // Detect authentication failures pattern
    const recentAuthFailures = recentRequests.filter(
      req => !req.success && req.endpoint.includes('auth')
    );

    if (recentAuthFailures.length > 5) {
      this.recordEvent({
        type: 'suspicious_activity',
        clientId,
        timestamp: now,
        details: {
          pattern: 'auth_bruteforce',
          authFailures: recentAuthFailures.length
        },
        severity: 'high'
      });
    }
  }

  /**
   * Record security event
   */
  private recordEvent(event: SecurityEvent): void {
    this.events.push(event);
    
    // Keep only recent events (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.events = this.events.filter(e => e.timestamp > oneDayAgo);

    // Log critical events
    if (event.severity === 'critical' || event.severity === 'high') {
      logger.warn('Security event recorded', {
        type: event.type,
        clientId: event.clientId,
        severity: event.severity,
        details: event.details
      });
    }
  }

  /**
   * Get client information
   */
  getClientInfo(clientId: string): ClientInfo | null {
    return this.clients.get(clientId) || null;
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalClients: number;
    blockedClients: number;
    highRiskClients: number;
    recentEvents: number;
    eventsByType: Record<string, number>;
  } {
    const now = new Date();
    const blockedClients = Array.from(this.clients.values()).filter(
      client => client.blocked && client.blockExpiry && now < client.blockExpiry
    ).length;

    const highRiskClients = Array.from(this.clients.values()).filter(
      client => client.riskScore > 70
    ).length;

    const recentEvents = this.events.filter(
      event => event.timestamp > new Date(now.getTime() - 60 * 60 * 1000) // Last hour
    ).length;

    const eventsByType = this.events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalClients: this.clients.size,
      blockedClients,
      highRiskClients,
      recentEvents,
      eventsByType
    };
  }

  /**
   * Get recent security events
   */
  getRecentEvents(limit: number = 50): SecurityEvent[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Cleanup old data
   */
  private cleanup(): void {
    const now = new Date();
    const cleanupThreshold = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours
    
    // Clean up old client data
    for (const [clientId, client] of this.clients) {
      // Remove old requests
      client.requests = client.requests.filter(req => req.timestamp > cleanupThreshold);
      
      // Remove clients with no recent activity
      if (client.requests.length === 0 && 
          (!client.lastFailedAttempt || client.lastFailedAttempt < cleanupThreshold) &&
          (!client.blocked || (client.blockExpiry && now > client.blockExpiry))) {
        this.clients.delete(clientId);
      }
    }

    // Clean up old events
    const eventCleanupThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
    this.events = this.events.filter(event => event.timestamp > eventCleanupThreshold);

    logger.debug('Security cleanup completed', {
      activeClients: this.clients.size,
      activeEvents: this.events.length
    });
  }

  /**
   * Generate client ID from request info
   */
  static generateClientId(ipAddress: string, userAgent?: string): string {
    const identifier = `${ipAddress}:${userAgent || 'unknown'}`;
    return createHash('sha256').update(identifier).digest('hex').slice(0, 16);
  }

  /**
   * Destroy the security manager
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}