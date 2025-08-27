export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  organizationId?: string
  organizationName?: string
  avatar?: string
  settings: UserSettings
  createdAt: Date
  lastActive: Date
}

export type UserRole = 'personal' | 'enterprise_user' | 'enterprise_admin'

export interface UserSettings {
  // Personal user settings
  theme: 'light' | 'dark' | 'auto'
  notifications: boolean
  aiPersonality: 'professional' | 'casual' | 'technical'
  language: string
  timezone: string
  
  // Enterprise user settings (controlled by admin)
  allowedSkills?: string[]
  documentAccess?: 'all' | 'limited' | 'department'
  aiModelPreference?: 'standard' | 'custom'
  
  // Enterprise admin settings
  organizationSettings?: {
    companyName: string
    industry: string
    allowedDomains: string[]
    ssoEnabled: boolean
    dataRetentionDays: number
    customBranding: boolean
    aiTrainingEnabled: boolean
    maxUsers: number
    billingPlan: 'team' | 'enterprise'
  }
}

export interface Organization {
  id: string
  name: string
  industry: string
  adminIds: string[]
  userIds: string[]
  settings: OrganizationSettings
  subscription: {
    plan: 'team' | 'enterprise'
    status: 'active' | 'trial' | 'suspended'
    trialEndsAt?: Date
    billingCycle: 'monthly' | 'yearly'
  }
  createdAt: Date
}

export interface OrganizationSettings {
  allowedDomains: string[]
  ssoEnabled: boolean
  dataRetentionDays: number
  customBranding: boolean
  aiTrainingEnabled: boolean
  maxUsers: number
  securityLevel: 'standard' | 'high' | 'enterprise'
  documentClassification: boolean
  auditLogging: boolean
}

// Test users wired into the application
export const TEST_USERS: User[] = [
  {
    id: 'user-personal-1',
    email: 'john.doe@example.com',
    name: 'John Doe',
    role: 'personal',
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=3b82f6&color=fff',
    settings: {
      theme: 'light',
      notifications: true,
      aiPersonality: 'professional',
      language: 'en',
      timezone: 'America/New_York'
    },
    createdAt: new Date('2024-01-01'),
    lastActive: new Date()
  },
  {
    id: 'user-enterprise-1',
    email: 'sarah.wilson@acmecorp.com',
    name: 'Sarah Wilson',
    role: 'enterprise_user',
    organizationId: 'org-acme-corp',
    organizationName: 'ACME Corporation',
    avatar: 'https://ui-avatars.com/api/?name=Sarah+Wilson&background=10b981&color=fff',
    settings: {
      theme: 'auto',
      notifications: true,
      aiPersonality: 'professional',
      language: 'en',
      timezone: 'America/Los_Angeles',
      allowedSkills: ['osha-compliance', 'contract-analysis', 'project-management'],
      documentAccess: 'department',
      aiModelPreference: 'custom'
    },
    createdAt: new Date('2024-01-15'),
    lastActive: new Date()
  },
  {
    id: 'user-admin-1',
    email: 'admin@acmecorp.com',
    name: 'Michael Chen',
    role: 'enterprise_admin',
    organizationId: 'org-acme-corp',
    organizationName: 'ACME Corporation',
    avatar: 'https://ui-avatars.com/api/?name=Michael+Chen&background=dc2626&color=fff',
    settings: {
      theme: 'dark',
      notifications: true,
      aiPersonality: 'technical',
      language: 'en',
      timezone: 'America/Los_Angeles',
      organizationSettings: {
        companyName: 'ACME Corporation',
        industry: 'Construction',
        allowedDomains: ['acmecorp.com'],
        ssoEnabled: true,
        dataRetentionDays: 2555, // 7 years
        customBranding: true,
        aiTrainingEnabled: true,
        maxUsers: 500,
        billingPlan: 'enterprise'
      }
    },
    createdAt: new Date('2024-01-01'),
    lastActive: new Date()
  },
  {
    id: 'user-enterprise-2',
    email: 'legal@techstartup.io',
    name: 'Emma Rodriguez',
    role: 'enterprise_user',
    organizationId: 'org-tech-startup',
    organizationName: 'TechStartup Inc',
    avatar: 'https://ui-avatars.com/api/?name=Emma+Rodriguez&background=8b5cf6&color=fff',
    settings: {
      theme: 'light',
      notifications: true,
      aiPersonality: 'professional',
      language: 'en',
      timezone: 'America/New_York',
      allowedSkills: ['legal-analysis', 'contract-review', 'compliance-check'],
      documentAccess: 'all',
      aiModelPreference: 'custom'
    },
    createdAt: new Date('2024-02-01'),
    lastActive: new Date()
  },
  {
    id: 'user-admin-2',
    email: 'cto@techstartup.io',
    name: 'David Kim',
    role: 'enterprise_admin',
    organizationId: 'org-tech-startup',
    organizationName: 'TechStartup Inc',
    avatar: 'https://ui-avatars.com/api/?name=David+Kim&background=f59e0b&color=fff',
    settings: {
      theme: 'dark',
      notifications: true,
      aiPersonality: 'technical',
      language: 'en',
      timezone: 'America/New_York',
      organizationSettings: {
        companyName: 'TechStartup Inc',
        industry: 'Technology',
        allowedDomains: ['techstartup.io'],
        ssoEnabled: false,
        dataRetentionDays: 1095, // 3 years
        customBranding: false,
        aiTrainingEnabled: true,
        maxUsers: 50,
        billingPlan: 'team'
      }
    },
    createdAt: new Date('2024-01-20'),
    lastActive: new Date()
  }
]

export const TEST_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-acme-corp',
    name: 'ACME Corporation',
    industry: 'Construction',
    adminIds: ['user-admin-1'],
    userIds: ['user-admin-1', 'user-enterprise-1'],
    settings: {
      allowedDomains: ['acmecorp.com'],
      ssoEnabled: true,
      dataRetentionDays: 2555,
      customBranding: true,
      aiTrainingEnabled: true,
      maxUsers: 500,
      securityLevel: 'enterprise',
      documentClassification: true,
      auditLogging: true
    },
    subscription: {
      plan: 'enterprise',
      status: 'active',
      billingCycle: 'yearly'
    },
    createdAt: new Date('2024-01-01')
  },
  {
    id: 'org-tech-startup',
    name: 'TechStartup Inc',
    industry: 'Technology',
    adminIds: ['user-admin-2'],
    userIds: ['user-admin-2', 'user-enterprise-2'],
    settings: {
      allowedDomains: ['techstartup.io'],
      ssoEnabled: false,
      dataRetentionDays: 1095,
      customBranding: false,
      aiTrainingEnabled: true,
      maxUsers: 50,
      securityLevel: 'standard',
      documentClassification: false,
      auditLogging: true
    },
    subscription: {
      plan: 'team',
      status: 'active',
      billingCycle: 'monthly'
    },
    createdAt: new Date('2024-01-20')
  }
]

// Auth utility functions
export function getUserById(id: string): User | undefined {
  return TEST_USERS.find(user => user.id === id)
}

export function getUserByEmail(email: string): User | undefined {
  return TEST_USERS.find(user => user.email === email)
}

export function getOrganizationById(id: string): Organization | undefined {
  return TEST_ORGANIZATIONS.find(org => org.id === id)
}

export function getUsersByOrganization(organizationId: string): User[] {
  return TEST_USERS.filter(user => user.organizationId === organizationId)
}

export function isAdmin(user: User): boolean {
  return user.role === 'enterprise_admin'
}

export function isEnterpriseUser(user: User): boolean {
  return user.role === 'enterprise_user' || user.role === 'enterprise_admin'
}

export function canAccessFeature(user: User, feature: string): boolean {
  switch (feature) {
    case 'ai-training':
      return isEnterpriseUser(user)
    case 'team-analytics':
      return isEnterpriseUser(user)
    case 'organization-settings':
      return isAdmin(user)
    case 'user-management':
      return isAdmin(user)
    case 'custom-skills':
      return user.role === 'personal' || isEnterpriseUser(user)
    case 'premium-support':
      return isEnterpriseUser(user)
    default:
      return true
  }
}

export function getAvailableSkills(user: User): string[] {
  if (user.role === 'personal') {
    return ['basic-qa', 'document-search', 'summarization']
  }
  
  if (user.settings.allowedSkills) {
    return user.settings.allowedSkills
  }
  
  // Default enterprise skills
  return [
    'osha-compliance', 'contract-analysis', 'project-management',
    'legal-analysis', 'compliance-check', 'risk-assessment'
  ]
}