import { NextRequest, NextResponse } from 'next/server'
import { withOrgContext } from '@/lib/db'

const PLAN_FEATURES = {
  free: {
    storage_limit_mb: 100,
    monthly_query_limit: 100,
    ai_credits: 50,
    max_skills: 2,
    max_automations: 1,
    features: ['basic_chat', 'document_upload']
  },
  pro: {
    storage_limit_mb: 10000, // 10GB
    monthly_query_limit: 2000,
    ai_credits: 500,
    max_skills: 10,
    max_automations: 10,
    features: ['basic_chat', 'document_upload', 'automations', 'skills_marketplace', 'memory', 'advanced_analytics']
  },
  team: {
    storage_limit_mb: 50000, // 50GB
    monthly_query_limit: 10000,
    ai_credits: 2000,
    max_skills: 20,
    max_automations: 50,
    features: ['basic_chat', 'document_upload', 'automations', 'skills_marketplace', 'memory', 'advanced_analytics', 'team_collaboration', 'role_management', 'audit_logs']
  },
  enterprise: {
    storage_limit_mb: -1, // Unlimited
    monthly_query_limit: -1, // Unlimited
    ai_credits: 10000,
    max_skills: 100,
    max_automations: -1, // Unlimited
    features: ['basic_chat', 'document_upload', 'automations', 'skills_marketplace', 'memory', 'advanced_analytics', 'team_collaboration', 'role_management', 'audit_logs', 'sso', 'on_premise', 'white_labeling', 'priority_support']
  }
}

const PLAN_PRICING = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 20, yearly: 200 },
  team: { monthly: 99, yearly: 990 },
  enterprise: { monthly: 'custom', yearly: 'custom' }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('org_id')
    const action = searchParams.get('action') || 'current'
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const userId = 'demo-user-id'

    switch (action) {
      case 'current':
        const currentSubscription = await getCurrentSubscription(orgId, userId)
        return NextResponse.json(currentSubscription)

      case 'usage':
        const usage = await getUsageMetrics(orgId, userId)
        return NextResponse.json(usage)

      case 'plans':
        return NextResponse.json({
          plans: Object.entries(PLAN_FEATURES).map(([planId, features]) => ({
            id: planId,
            name: planId.charAt(0).toUpperCase() + planId.slice(1),
            pricing: PLAN_PRICING[planId as keyof typeof PLAN_PRICING],
            features,
            recommended: planId === 'pro'
          }))
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error getting subscription:', error)
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { org_id, action, plan_id, billing_period } = body
    
    if (!org_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const userId = 'demo-user-id'

    switch (action) {
      case 'upgrade':
        if (!plan_id) {
          return NextResponse.json(
            { error: 'Plan ID is required for upgrade' },
            { status: 400 }
          )
        }
        const upgradeResult = await upgradePlan(org_id, userId, plan_id, billing_period)
        return NextResponse.json(upgradeResult)

      case 'cancel':
        const cancelResult = await cancelSubscription(org_id, userId)
        return NextResponse.json(cancelResult)

      case 'purchase_credits':
        const { credits } = body
        if (!credits || credits < 1) {
          return NextResponse.json(
            { error: 'Valid credit amount is required' },
            { status: 400 }
          )
        }
        const creditsResult = await purchaseCredits(org_id, userId, credits)
        return NextResponse.json(creditsResult)

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error processing subscription:', error)
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    )
  }
}

async function getCurrentSubscription(orgId: string, userId: string) {
  return await withOrgContext(orgId, userId, async (client) => {
    const orgResult = await client.query(`
      SELECT 
        o.*,
        s.plan_id,
        s.status as subscription_status,
        s.current_period_start,
        s.current_period_end,
        s.billing_email
      FROM orgs o
      LEFT JOIN subscriptions s ON o.id = s.org_id AND s.status = 'active'
      WHERE o.id = $1
    `, [orgId])

    if (orgResult.rows.length === 0) {
      throw new Error('Organization not found')
    }

    const org = orgResult.rows[0]
    const currentPlan = org.plan || 'free'
    const features = PLAN_FEATURES[currentPlan as keyof typeof PLAN_FEATURES]

    return {
      organization: {
        id: org.id,
        name: org.name,
        plan: currentPlan,
        storage_used_mb: await getStorageUsed(client, orgId),
        monthly_queries_used: org.monthly_queries || 0,
        ai_credits_remaining: org.ai_credits || 0
      },
      subscription: {
        plan_id: org.plan_id || currentPlan,
        status: org.subscription_status || 'active',
        current_period_start: org.current_period_start,
        current_period_end: org.current_period_end,
        billing_email: org.billing_email
      },
      plan_features: features,
      usage_limits: {
        storage_limit_mb: features.storage_limit_mb,
        monthly_query_limit: features.monthly_query_limit,
        max_skills: features.max_skills,
        max_automations: features.max_automations
      }
    }
  })
}

async function getUsageMetrics(orgId: string, userId: string) {
  return await withOrgContext(orgId, userId, async (client) => {
    const [
      storageUsed,
      queriesThisMonth,
      skillsInstalled,
      automationsActive,
      creditsUsed
    ] = await Promise.all([
      getStorageUsed(client, orgId),
      
      client.query(`
        SELECT COUNT(*) as count
        FROM usage_analytics 
        WHERE org_id = $1 
          AND metric_type = 'query'
          AND created_at >= DATE_TRUNC('month', NOW())
      `, [orgId]),
      
      client.query(`
        SELECT COUNT(*) as count
        FROM org_skills 
        WHERE org_id = $1 AND status = 'active'
      `, [orgId]),
      
      client.query(`
        SELECT COUNT(*) as count
        FROM automations 
        WHERE org_id = $1 AND status = 'active'
      `, [orgId]),
      
      client.query(`
        SELECT COALESCE(SUM(metric_value), 0) as used
        FROM usage_analytics 
        WHERE org_id = $1 
          AND metric_type = 'skill_use'
          AND created_at >= DATE_TRUNC('month', NOW())
      `, [orgId])
    ])

    return {
      storage_used_mb: storageUsed,
      queries_this_month: parseInt(queriesThisMonth.rows[0].count),
      skills_installed: parseInt(skillsInstalled.rows[0].count),
      automations_active: parseInt(automationsActive.rows[0].count),
      ai_credits_used_this_month: parseInt(creditsUsed.rows[0].used || '0'),
      last_updated: new Date().toISOString()
    }
  })
}

async function getStorageUsed(client: any, orgId: string): Promise<number> {
  const result = await client.query(`
    SELECT COALESCE(SUM(
      CASE 
        WHEN meta_json->>'file_size' IS NOT NULL 
        THEN (meta_json->>'file_size')::bigint
        ELSE LENGTH(text) 
      END
    ), 0) as total_bytes
    FROM documents d
    JOIN sources s ON d.source_id = s.id
    LEFT JOIN chunks c ON d.id = c.document_id
    WHERE s.org_id = $1
  `, [orgId])

  return Math.round(parseInt(result.rows[0].total_bytes || '0') / (1024 * 1024)) // Convert to MB
}

async function upgradePlan(
  orgId: string, 
  userId: string, 
  planId: string, 
  billingPeriod: 'monthly' | 'yearly' = 'monthly'
) {
  if (!PLAN_FEATURES[planId as keyof typeof PLAN_FEATURES]) {
    throw new Error('Invalid plan ID')
  }

  return await withOrgContext(orgId, userId, async (client) => {
    const features = PLAN_FEATURES[planId as keyof typeof PLAN_FEATURES]
    
    // Update organization plan and limits
    await client.query(`
      UPDATE orgs 
      SET 
        plan = $1,
        storage_limit_mb = $2,
        monthly_query_limit = $3,
        ai_credits = GREATEST(ai_credits, $4),
        features_json = $5,
        updated_at = NOW()
      WHERE id = $6
    `, [
      planId,
      features.storage_limit_mb,
      features.monthly_query_limit,
      features.ai_credits,
      JSON.stringify({ features: features.features }),
      orgId
    ])

    // Create or update subscription record
    const periodEnd = billingPeriod === 'yearly' 
      ? "NOW() + INTERVAL '1 year'"
      : "NOW() + INTERVAL '1 month'"

    await client.query(`
      INSERT INTO subscriptions (org_id, plan_id, status, current_period_start, current_period_end)
      VALUES ($1, $2, 'active', NOW(), ${periodEnd})
      ON CONFLICT (org_id) 
      DO UPDATE SET 
        plan_id = EXCLUDED.plan_id,
        status = 'active',
        current_period_start = NOW(),
        current_period_end = EXCLUDED.current_period_end,
        updated_at = NOW()
    `, [orgId, planId])

    // Log the upgrade
    await client.query(`
      INSERT INTO audit (actor_id, action, target, result, meta_json)
      VALUES ($1, 'plan_upgrade', $2, 'success', $3)
    `, [
      userId,
      orgId,
      JSON.stringify({ new_plan: planId, billing_period: billingPeriod })
    ])

    return {
      success: true,
      message: `Successfully upgraded to ${planId} plan`,
      new_plan: planId,
      billing_period: billingPeriod,
      effective_date: new Date().toISOString()
    }
  })
}

async function cancelSubscription(orgId: string, userId: string) {
  return await withOrgContext(orgId, userId, async (client) => {
    // Update subscription status
    await client.query(`
      UPDATE subscriptions 
      SET status = 'cancelled', updated_at = NOW()
      WHERE org_id = $1 AND status = 'active'
    `, [orgId])

    // Keep current plan active until period end, but don't auto-renew
    await client.query(`
      INSERT INTO audit (actor_id, action, target, result, meta_json)
      VALUES ($1, 'subscription_cancel', $2, 'success', $3)
    `, [
      userId,
      orgId,
      JSON.stringify({ cancellation_date: new Date().toISOString() })
    ])

    return {
      success: true,
      message: 'Subscription cancelled successfully',
      note: 'Your current plan will remain active until the end of the billing period'
    }
  })
}

async function purchaseCredits(orgId: string, userId: string, credits: number) {
  const creditCost = 0.10 // $0.10 per credit
  const totalCost = credits * creditCost

  return await withOrgContext(orgId, userId, async (client) => {
    // Add credits to organization
    await client.query(`
      UPDATE orgs 
      SET ai_credits = ai_credits + $1, updated_at = NOW()
      WHERE id = $2
    `, [credits, orgId])

    // Log the purchase
    await client.query(`
      INSERT INTO audit (actor_id, action, target, result, meta_json)
      VALUES ($1, 'credits_purchase', $2, 'success', $3)
    `, [
      userId,
      orgId,
      JSON.stringify({ 
        credits_purchased: credits, 
        cost: totalCost,
        purchase_date: new Date().toISOString()
      })
    ])

    return {
      success: true,
      message: `Successfully purchased ${credits} AI credits`,
      credits_purchased: credits,
      total_cost: totalCost,
      new_balance: await client.query(`SELECT ai_credits FROM orgs WHERE id = $1`, [orgId])
        .then((result: any) => result.rows[0].ai_credits)
    }
  })
}