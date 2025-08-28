import { NextRequest, NextResponse } from 'next/server'
import { withOrgContext } from '@/lib/db'
import { hashPassword, createSessionToken, createUserSession } from '@/lib/auth-utils'
import { z } from 'zod'

const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  organizationName: z.string().optional(),
  role: z.enum(['personal', 'enterprise_user', 'enterprise_admin']).default('personal')
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, organizationName, role } = RegisterRequestSchema.parse(body)
    
    // Check if user already exists
    const existingUser = await withOrgContext('', '', async (client) => {
      const result = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      )
      return result.rows[0]
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }
    
    // Hash password
    const passwordHash = await hashPassword(password)
    
    // Create user and organization
    const user = await withOrgContext('', '', async (client) => {
      await client.query('BEGIN')
      
      try {
        // Create organization if needed
        let orgId: string
        if (organizationName && role !== 'personal') {
          const orgResult = await client.query(`
            INSERT INTO orgs (name, plan)
            VALUES ($1, $2)
            RETURNING id
          `, [organizationName, role === 'enterprise_admin' ? 'enterprise' : 'pro'])
          orgId = orgResult.rows[0].id
        } else {
          // Create personal organization
          const orgResult = await client.query(`
            INSERT INTO orgs (name, plan)
            VALUES ($1, 'free')
            RETURNING id
          `, [`${name}'s Workspace`])
          orgId = orgResult.rows[0].id
        }
        
        // Create user
        const userResult = await client.query(`
          INSERT INTO users (email, name, password_hash, org_id, role, settings_json)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, email, name, role, org_id, created_at
        `, [
          email,
          name,
          passwordHash,
          orgId,
          role === 'personal' ? 'admin' : role.replace('enterprise_', ''),
          JSON.stringify({
            theme: 'auto',
            notifications: true,
            aiPersonality: 'professional',
            language: 'en',
            timezone: 'UTC'
          })
        ])
        
        await client.query('COMMIT')
        return userResult.rows[0]
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    })
    
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
      orgId: user.org_id,
      sessionId
    })
    
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.org_id
      },
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
    console.error('Registration error:', error)
    
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
