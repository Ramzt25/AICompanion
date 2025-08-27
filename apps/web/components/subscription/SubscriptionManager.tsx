'use client'

import { useState } from 'react'
import { Check, Crown, Zap, Users, Building, ArrowRight, CreditCard } from 'lucide-react'

interface SubscriptionManagerProps {
  orgId: string
}

export default function SubscriptionManager({ orgId }: SubscriptionManagerProps) {
  const [currentPlan, setCurrentPlan] = useState('free')
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  
  const plans = [
    {
      id: 'free',
      name: 'Free',
      icon: Zap,
      description: 'Perfect for individual hobbyists',
      pricing: { monthly: 0, yearly: 0 },
      features: {
        storage_limit_mb: 100,
        monthly_query_limit: 100,
        ai_credits: 50,
        max_skills: 2,
        max_automations: 1,
        features: ['Basic chat', 'Document upload', 'Simple Q&A']
      },
      color: 'gray',
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro Individual',
      icon: Crown,
      description: 'For power users and professionals',
      pricing: { monthly: 20, yearly: 200 },
      features: {
        storage_limit_mb: 10000,
        monthly_query_limit: 2000,
        ai_credits: 500,
        max_skills: 10,
        max_automations: 10,
        features: ['Everything in Free', 'Advanced analytics', 'Skills marketplace', 'Memory & learning', 'Automations', 'Priority support']
      },
      color: 'blue',
      popular: true
    },
    {
      id: 'team',
      name: 'Team',
      icon: Users,
      description: 'For teams and small organizations',
      pricing: { monthly: 99, yearly: 990 },
      features: {
        storage_limit_mb: 50000,
        monthly_query_limit: 10000,
        ai_credits: 2000,
        max_skills: 20,
        max_automations: 50,
        features: ['Everything in Pro', 'Team collaboration', 'Role management', 'Audit logs', 'Shared memory', 'Weekly digests', 'Team analytics']
      },
      color: 'green',
      popular: false
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: Building,
      description: 'For large organizations',
      pricing: { monthly: 'custom', yearly: 'custom' },
      features: {
        storage_limit_mb: -1,
        monthly_query_limit: -1,
        ai_credits: 10000,
        max_skills: 100,
        max_automations: -1,
        features: ['Everything in Team', 'SSO integration', 'On-premise deployment', 'White labeling', 'Custom integrations', 'Dedicated support', 'SLA guarantees']
      },
      color: 'purple',
      popular: false
    }
  ]

  const usage = {
    storage_used_mb: 45,
    queries_this_month: 67,
    skills_installed: 2,
    automations_active: 1,
    ai_credits_remaining: 23
  }

  const formatLimit = (limit: number) => {
    if (limit === -1) return 'Unlimited'
    if (limit >= 1000) return `${limit / 1000}GB`
    return `${limit}MB`
  }

  const formatPrice = (price: number | string) => {
    if (price === 'custom') return 'Custom'
    if (price === 0) return 'Free'
    return `$${price}`
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100'
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  return (
    <div className="space-y-6">
      {/* Current Usage */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{usage.storage_used_mb}MB</div>
            <div className="text-sm text-gray-500">Storage Used</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${getUsagePercentage(usage.storage_used_mb, 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{usage.queries_this_month}</div>
            <div className="text-sm text-gray-500">Queries This Month</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${getUsagePercentage(usage.queries_this_month, 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{usage.skills_installed}</div>
            <div className="text-sm text-gray-500">Skills Installed</div>
            <div className="text-xs text-gray-400 mt-1">Max: 2</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{usage.automations_active}</div>
            <div className="text-sm text-gray-500">Active Automations</div>
            <div className="text-xs text-gray-400 mt-1">Max: 1</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{usage.ai_credits_remaining}</div>
            <div className="text-sm text-gray-500">AI Credits Left</div>
            <button className="text-xs text-blue-600 hover:text-blue-800 mt-1">Buy more</button>
          </div>
        </div>
      </div>

      {/* Billing Period Toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Subscription Plans</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Billing period:</span>
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === 'monthly' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === 'yearly' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                <span className="ml-1 text-xs text-green-600">(Save 17%)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map(plan => {
            const Icon = plan.icon
            const isCurrentPlan = currentPlan === plan.id
            const price = plan.pricing[billingPeriod]
            
            return (
              <div
                key={plan.id}
                className={`relative rounded-lg border-2 p-6 ${
                  plan.popular 
                    ? 'border-blue-500 shadow-lg' 
                    : isCurrentPlan
                    ? 'border-green-500'
                    : 'border-gray-200 hover:border-gray-300'
                } transition-all`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="text-center mb-6">
                  <div className={`inline-flex p-3 rounded-lg bg-${plan.color}-100 mb-3`}>
                    <Icon className={`w-6 h-6 text-${plan.color}-600`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                </div>

                {/* Pricing */}
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatPrice(price)}
                    {typeof price === 'number' && price > 0 && (
                      <span className="text-sm font-normal text-gray-500">
                        /{billingPeriod === 'yearly' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                  {billingPeriod === 'yearly' && typeof price === 'number' && price > 0 && (
                    <div className="text-sm text-gray-500 mt-1">
                      ${Math.round(price / 12)}/month billed yearly
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  <div className="text-sm">
                    <div className="flex justify-between items-center">
                      <span>Storage</span>
                      <span className="font-medium">{formatLimit(plan.features.storage_limit_mb)}</span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="flex justify-between items-center">
                      <span>Monthly Queries</span>
                      <span className="font-medium">
                        {plan.features.monthly_query_limit === -1 ? 'Unlimited' : plan.features.monthly_query_limit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="flex justify-between items-center">
                      <span>AI Credits</span>
                      <span className="font-medium">{plan.features.ai_credits.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="flex justify-between items-center">
                      <span>Skills</span>
                      <span className="font-medium">
                        {plan.features.max_skills === -1 ? 'Unlimited' : plan.features.max_skills}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3 mt-3">
                    <ul className="space-y-2">
                      {plan.features.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  disabled={isCurrentPlan}
                  className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {isCurrentPlan ? 'Current Plan' : plan.id === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Additional Credits */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Additional AI Credits
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Need more AI assistance? Purchase additional credits for $0.10 each.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { credits: 100, price: 10, popular: false },
            { credits: 500, price: 45, popular: true },
            { credits: 1000, price: 80, popular: false }
          ].map((option, index) => (
            <div 
              key={index}
              className={`border rounded-lg p-4 text-center ${
                option.popular ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              {option.popular && (
                <div className="text-xs text-blue-600 font-medium mb-2">Best Value</div>
              )}
              <div className="text-2xl font-bold text-gray-900">{option.credits}</div>
              <div className="text-sm text-gray-500 mb-3">AI Credits</div>
              <div className="text-lg font-semibold text-gray-900 mb-4">${option.price}</div>
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Purchase
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}