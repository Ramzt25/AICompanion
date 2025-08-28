import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, AuthenticatedUser } from '@/lib/auth-utils'

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthenticatedUser
}

/**
 * Middleware to authenticate API requests
 * Returns 401 if authentication fails
 */
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const user = await authenticateRequest(req)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Add user to request object
    const authenticatedReq = req as AuthenticatedRequest
    authenticatedReq.user = user
    
    return handler(authenticatedReq)
  }
}

/**
 * Optional authentication middleware
 * Adds user to request if authenticated, but doesn't fail if not
 */
export function withOptionalAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const user = await authenticateRequest(req)
    
    // Add user to request object (may be undefined)
    const authenticatedReq = req as AuthenticatedRequest
    authenticatedReq.user = user || undefined
    
    return handler(authenticatedReq)
  }
}

/**
 * Role-based authorization middleware
 */
export function withRole(
  requiredRoles: string[],
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (req: AuthenticatedRequest): Promise<NextResponse> => {
    if (!req.user || !requiredRoles.includes(req.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    return handler(req)
  })
}

/**
 * Organization-based authorization middleware
 */
export function withOrgAccess(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (req: AuthenticatedRequest): Promise<NextResponse> => {
    const url = new URL(req.url)
    const orgId = url.searchParams.get('org_id') || 
                  req.headers.get('x-org-id')
    
    if (orgId && orgId !== req.user?.orgId) {
      return NextResponse.json(
        { error: 'Organization access denied' },
        { status: 403 }
      )
    }
    
    return handler(req)
  })
}
