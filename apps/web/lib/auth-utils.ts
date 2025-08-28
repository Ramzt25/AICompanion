import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'
import { withOrgContext } from '@/lib/db'

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-key-change-in-production'
)

export interface JWTPayload {
  userId: string
  email: string
  role: string
  orgId: string
  sessionId: string
  exp: number
  iat: number
}

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: string
  orgId: string
  sessionId: string
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Create a JWT token for a user session
 */
export async function createSessionToken(payload: Omit<JWTPayload, 'exp' | 'iat'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (24 * 60 * 60) // 24 hours
  
  return new SignJWT({ ...payload, exp, iat: now })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(exp)
    .setIssuedAt(now)
    .sign(secret)
}

/**
 * Verify and decode a JWT token
 */
export async function verifySessionToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as JWTPayload
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

/**
 * Extract user information from request headers or cookies
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthenticatedUser | null> {
  // Try to get token from Authorization header
  let token = req.headers.get('authorization')?.replace('Bearer ', '')
  
  // If not in header, try cookie
  if (!token) {
    token = req.cookies.get('auth-token')?.value
  }
  
  if (!token) {
    return null
  }
  
  const payload = await verifySessionToken(token)
  if (!payload) {
    return null
  }
  
  // Verify session is still valid in database
  try {
    const isValidSession = await withOrgContext(payload.orgId, payload.userId, async (client) => {
      const result = await client.query(`
        SELECT us.id, u.name, u.email, u.role, u.org_id
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        WHERE us.id = $1 AND us.expires_at > NOW() AND us.user_id = $2
      `, [payload.sessionId, payload.userId])
      
      if (result.rows.length === 0) {
        return null
      }
      
      // Update last_used_at
      await client.query(`
        UPDATE user_sessions 
        SET last_used_at = NOW() 
        WHERE id = $1
      `, [payload.sessionId])
      
      return result.rows[0]
    })
    
    if (!isValidSession) {
      return null
    }
    
    return {
      id: payload.userId,
      email: payload.email,
      name: isValidSession.name,
      role: payload.role,
      orgId: payload.orgId,
      sessionId: payload.sessionId
    }
  } catch (error) {
    console.error('Session validation error:', error)
    return null
  }
}

/**
 * Create a new user session in the database
 */
export async function createUserSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  return withOrgContext('', userId, async (client) => {
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    await client.query(`
      INSERT INTO user_sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [sessionId, userId, '', expiresAt, ipAddress, userAgent])
    
    return sessionId
  })
}

/**
 * Revoke a user session
 */
export async function revokeUserSession(sessionId: string): Promise<void> {
  await withOrgContext('', '', async (client) => {
    await client.query(`
      DELETE FROM user_sessions WHERE id = $1
    `, [sessionId])
  })
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  await withOrgContext('', '', async (client) => {
    await client.query(`
      DELETE FROM user_sessions WHERE expires_at < NOW()
    `)
  })
}

/**
 * Rate limiting helper
 */
export async function checkRateLimit(
  identifier: string,
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  // This is a simple in-memory rate limiter
  // In production, you'd want to use Redis for this
  const now = Date.now()
  const window = Math.floor(now / windowMs)
  const key = `${identifier}:${window}`
  
  // For now, we'll always allow requests
  // TODO: Implement proper Redis-based rate limiting
  return {
    allowed: true,
    remaining: maxRequests - 1,
    resetTime: new Date(now + windowMs)
  }
}

/**
 * Generate a secure random token for password resets, etc.
 */
export function generateSecureToken(): string {
  return crypto.randomUUID() + '-' + crypto.randomUUID()
}

/**
 * Hash a token for storage (for password reset tokens, etc.)
 */
export async function hashToken(token: string): Promise<string> {
  return hashPassword(token)
}

/**
 * Verify a token against a hash
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  return verifyPassword(token, hash)
}
