import { NextRequest, NextResponse } from 'next/server'
import { withOrgContext } from '@/lib/db'
import { verifyPassword, createSessionToken, createUserSession } from '@/lib/auth-utils'
import { z } from 'zod'

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = LoginRequestSchema.parse(body)
    
    // Find user and verify password
    const user = await withOrgContext('', '', async (client) => {
      const result = await client.query(`
        SELECT id, email, name, password_hash, role, org_id, 
               failed_login_attempts, locked_until
        FROM users 
        WHERE email = $1
      `, [email])
      
      if (result.rows.length === 0) {
        return null
      }
      
      const user = result.rows[0]
      
      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        throw new Error('Account temporarily locked due to failed login attempts')
      }
      
      // Verify password
      const isValidPassword = await verifyPassword(password, user.password_hash)
      
      if (!isValidPassword) {
        // Increment failed attempts
        const newFailedAttempts = (user.failed_login_attempts || 0) + 1
        const lockUntil = newFailedAttempts >= 5 
          ? new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
          : null
        
        await client.query(`
          UPDATE users 
          SET failed_login_attempts = $1, locked_until = $2
          WHERE id = $3
        `, [newFailedAttempts, lockUntil, user.id])
        
        throw new Error('Invalid credentials')
      }
      
      // Reset failed attempts on successful login
      await client.query(`
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW()
        WHERE id = $1
      `, [user.id])
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.org_id
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    // Create session
    const sessionId = await createUserSession(
      user.id,
      req.ip,
      req.headers.get('user-agent') || undefined
    )
    
    // Create JWT token
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      sessionId
    })
    
    const response = NextResponse.json({
      user,
      token
    })
    
    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    })
    
    return response
    
  } catch (error: any) {
    console.error('Login error:', error)
    
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error?.message?.includes('locked') || error?.message?.includes('credentials')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
