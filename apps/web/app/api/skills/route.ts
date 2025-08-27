import { NextRequest, NextResponse } from 'next/server'
import { SkillsMarketplace } from '@/lib/skills-marketplace'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('org_id')
    const action = searchParams.get('action') || 'browse'
    
    if (!orgId && action === 'installed') {
      return NextResponse.json(
        { error: 'Organization ID is required for installed skills' },
        { status: 400 }
      )
    }

    const userId = 'demo-user-id'

    switch (action) {
      case 'browse':
        const category = searchParams.get('category') as any
        const search = searchParams.get('search') || undefined
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        
        const browseResult = await SkillsMarketplace.browseSkills(category, search, page, limit)
        return NextResponse.json(browseResult)

      case 'installed':
        const installedSkills = await SkillsMarketplace.getInstalledSkills(orgId!, userId)
        return NextResponse.json({ installed_skills: installedSkills })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: browse or installed' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error getting skills:', error)
    return NextResponse.json(
      { error: 'Failed to get skills' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { org_id, skill_id, configuration, action } = body
    
    if (!org_id || !skill_id) {
      return NextResponse.json(
        { error: 'Organization ID and Skill ID are required' },
        { status: 400 }
      )
    }

    const userId = 'demo-user-id'

    switch (action) {
      case 'install':
        const installResult = await SkillsMarketplace.installSkill(
          org_id,
          userId,
          skill_id,
          configuration || {}
        )
        return NextResponse.json(installResult)

      case 'execute':
        const { input } = body
        if (!input) {
          return NextResponse.json(
            { error: 'Input is required for skill execution' },
            { status: 400 }
          )
        }
        
        const executeResult = await SkillsMarketplace.executeSkill(
          org_id,
          userId,
          skill_id,
          input
        )
        return NextResponse.json(executeResult)

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: install or execute' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error processing skill action:', error)
    return NextResponse.json(
      { error: 'Failed to process skill action' },
      { status: 500 }
    )
  }
}