const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { validateTokenFromHeader } = require('../utils/tokenUtils');

// In-memory session store (in production, use Redis or similar)
const sessions = new Map();

class SessionManager {
  constructor() {
    this.sessions = sessions;
    this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), 15 * 60 * 1000); // Cleanup every 15 minutes
  }

  createSession(userId, userType, deviceInfo = {}) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    // Create JWT-based refresh token for persistence across server restarts
    const refreshToken = jwt.sign(
      { 
        id: userId, 
        userType, 
        sessionId,
        type: 'refresh'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Refresh tokens last 7 days
    );
    
    const session = {
      sessionId,
      userId,
      userType,
      deviceInfo,
      refreshToken,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    this.sessions.set(sessionId, session);
    return { sessionId, refreshToken };
  }

  generateAccessToken(userId, userType, sessionId) {
    return jwt.sign(
      { 
        id: userId, 
        userType, 
        sessionId 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
  }

  async refreshSession(refreshToken) {
    // Check if this is a JWT refresh token or legacy random string
    let decoded = null;
    let isJWTToken = false;
    
    try {
      // Try to decode as JWT first
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      if (decoded.id && decoded.userType && decoded.type === 'refresh') {
        isJWTToken = true;
      } else {
        decoded = null;
      }
    } catch (jwtError) {
      // Not a JWT or invalid JWT, might be legacy random string
      decoded = null;
    }

    if (isJWTToken) {
      // Handle JWT-based refresh token
      try {
        // Find session by refresh token
        let session = Array.from(this.sessions.values())
          .find(s => s.refreshToken === refreshToken);

        if (!session) {
          // Session not found (likely due to server restart)
          // Create a new session for this user since the refresh token is still valid
          logger.info('Session lost, recreating from valid refresh token:', {
            userId: decoded.id,
            userType: decoded.userType,
            sessionId: decoded.sessionId
          });

          const deviceInfo = { userAgent: 'Recovered Session', ip: 'unknown' };
          const newSession = this.createSession(decoded.id, decoded.userType, deviceInfo);
          
          // Generate new tokens
          const accessToken = this.generateAccessToken(
            decoded.id,
            decoded.userType,
            newSession.sessionId
          );

          return {
            accessToken,
            refreshToken: newSession.refreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '15m'
          };
        }

        // Session exists, proceed with normal refresh
        // Check if session is too old (beyond reasonable refresh window)
        const maxSessionAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (Date.now() - session.createdAt > maxSessionAge) {
          this.sessions.delete(session.sessionId);
          throw new Error('Session expired - please login again');
        }

        // Update session
        session.lastActivity = Date.now();
        this.sessions.set(session.sessionId, session);

        // Generate new access token (keep same refresh token)
        const accessToken = this.generateAccessToken(
          session.userId,
          session.userType,
          session.sessionId
        );

        return {
          accessToken,
          refreshToken: session.refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '15m'
        };
        
      } catch (error) {
        logger.warn('JWT refresh token processing failed:', { error: error.message });
        throw new Error('Session expired - please login again');
      }
    } else {
      // Handle legacy random string refresh token
      const session = Array.from(this.sessions.values())
        .find(s => s.refreshToken === refreshToken);

      if (!session) {
        // Legacy token and no session found - require re-login
        logger.warn('Legacy refresh token not found in sessions');
        throw new Error('Session expired - please login again');
      }

      // Check if session is too old
      const maxSessionAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (Date.now() - session.createdAt > maxSessionAge) {
        this.sessions.delete(session.sessionId);
        throw new Error('Session expired - please login again');
      }

      // Update session
      session.lastActivity = Date.now();
      this.sessions.set(session.sessionId, session);

      // Generate new tokens (upgrade to JWT-based refresh token)
      const accessToken = this.generateAccessToken(
        session.userId,
        session.userType,
        session.sessionId
      );

      // Create new JWT-based refresh token
      const newRefreshToken = jwt.sign(
        { 
          id: session.userId, 
          userType: session.userType, 
          sessionId: session.sessionId,
          type: 'refresh'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Update session with new refresh token
      session.refreshToken = newRefreshToken;
      this.sessions.set(session.sessionId, session);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
      };
    }
  }

  getUserSessions(userId, userType) {
    return Array.from(this.sessions.values())
      .filter(session => 
        session.userId === userId && 
        session.userType === userType
      )
      .map(({ refreshToken, ...session }) => ({
        ...session,
        active: true
      }));
  }

  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    return !!session;
  }

  removeSession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxAge) {
        this.sessions.delete(sessionId);
        logger.debug(`Cleaned up expired session: ${sessionId}`);
      }
    }
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

// Middleware to validate session
const validateSessionMiddleware = (req, res, next) => {
  // Validate and extract token from Authorization header
  const tokenValidation = validateTokenFromHeader(req.headers.authorization);
  
  if (!tokenValidation.isValid) {
    logger.warn('Token validation failed:', {
      error: tokenValidation.error,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      authHeader: req.headers.authorization ? 'present' : 'missing'
    });
    
    return res.status(401).json({
      success: false,
      message: tokenValidation.error || 'Invalid token'
    });
  }

  const token = tokenValidation.token;

  // Check JWT secret exists
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET not configured');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate decoded token structure
    if (!decoded.id || !decoded.userType) {
      logger.warn('Invalid token payload:', { 
        decoded: { ...decoded, id: decoded.id ? 'present' : 'missing', userType: decoded.userType || 'missing' },
        ip: req.ip 
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload'
      });
    }

    // For new session-based tokens, check session
    if (decoded.sessionId) {
      if (!sessionManager.validateSession(decoded.sessionId)) {
        logger.warn('Session not found, possible server restart:', { 
          sessionId: decoded.sessionId,
          ip: req.ip,
          userType: decoded.userType 
        });
        
        // Instead of failing immediately, create a new session for this user
        // This handles the case where server restarts and sessions are lost
        const deviceInfo = {
          userAgent: req.get('User-Agent') || 'Unknown',
          ip: req.ip
        };
        
        const { sessionId: newSessionId } = sessionManager.createSession(
          decoded.id, 
          decoded.userType, 
          deviceInfo
        );
        
        logger.info('Created new session for existing token:', {
          userId: decoded.id,
          userType: decoded.userType,
          newSessionId,
          ip: req.ip
        });

        // Attach session info to request
        req.session = {
          sessionId: newSessionId,
          userId: decoded.id,
          userType: decoded.userType
        };
      } else {
        // Attach session info to request
        req.session = {
          sessionId: decoded.sessionId,
          userId: decoded.id,
          userType: decoded.userType
        };
      }
    } else {
      // Legacy token support (without sessionId)
      req.session = {
        userId: decoded.id,
        userType: decoded.userType
      };
    }

    // Log successful authentication for debugging
    logger.debug('Session validated successfully:', {
      userId: decoded.id,
      userType: decoded.userType,
      sessionId: decoded.sessionId || 'legacy',
      ip: req.ip
    });

    console.log('✅ Session validation successful:', {
      userId: decoded.id,
      userType: decoded.userType,
      sessionId: decoded.sessionId || 'legacy',
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    // More specific error handling
    let errorMessage = 'Invalid or expired token';
    
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      if (error.message.includes('malformed')) {
        errorMessage = 'Malformed token';
      } else if (error.message.includes('invalid signature')) {
        errorMessage = 'Invalid token signature';
      } else {
        errorMessage = 'Invalid token';
      }
    } else if (error.name === 'NotBeforeError') {
      errorMessage = 'Token not active yet';
    }

    logger.warn('JWT verification failed:', {
      error: error.name,
      message: error.message,
      tokenLength: token ? token.length : 0,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });

    return res.status(401).json({
      success: false,
      message: errorMessage
    });
  }
};

module.exports = {
  sessionManager,
  validateSessionMiddleware
};