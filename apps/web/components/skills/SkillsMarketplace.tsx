'use client'

import { useState } from 'react'
import { Zap, Star, Download, Settings, Play } from 'lucide-react'

interface Skill {
  id: string
  name: string
  description: string
  category: 'compliance' | 'extraction' | 'analysis' | 'automation'
  author: string
  version: string
  rating: number
  installation_count: number
  status: 'active' | 'deprecated' | 'under_review'
}

interface SkillsMarketplaceProps {
  orgId: string
}

export default function SkillsMarketplace({ orgId }: SkillsMarketplaceProps) {
  const [skills] = useState<Skill[]>([
    {
      id: '1',
      name: 'OSHA Compliance Check',
      description: 'Automatically scan documents for OSHA compliance requirements and violations',
      category: 'compliance',
      author: 'Safety Systems Inc.',
      version: '2.1.0',
      rating: 4.8,
      installation_count: 1250,
      status: 'active'
    },
    {
      id: '2', 
      name: 'Contract Clause Extractor',
      description: 'Extract key contract clauses including payment terms, termination, and liability',
      category: 'extraction',
      author: 'LegalTech Solutions',
      version: '1.5.2',
      rating: 4.6,
      installation_count: 890,
      status: 'active'
    },
    {
      id: '3',
      name: 'Project Timeline Analyzer',
      description: 'Analyze project timelines, identify risks, and suggest optimizations',
      category: 'analysis',
      author: 'ProjectOps AI',
      version: '3.0.1',
      rating: 4.9,
      installation_count: 2100,
      status: 'active'
    },
    {
      id: '4',
      name: 'Document Summarizer',
      description: 'Generate concise summaries of long documents with key points extraction',
      category: 'analysis',
      author: 'AI Companion Team',
      version: '1.0.0',
      rating: 4.7,
      installation_count: 3400,
      status: 'active'
    }
  ])

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [installedSkills, setInstalledSkills] = useState<Set<string>>(new Set(['1', '4']))

  const filteredSkills = skills.filter(skill => 
    selectedCategory === 'all' || skill.category === selectedCategory
  )

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'compliance': return 'bg-red-100 text-red-800'
      case 'extraction': return 'bg-blue-100 text-blue-800'
      case 'analysis': return 'bg-green-100 text-green-800'
      case 'automation': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const installSkill = (skillId: string) => {
    setInstalledSkills(prev => new Set([...prev, skillId]))
  }

  const executeSkill = (skillId: string) => {
    // Demo execution
    alert(`Executing skill ${skillId}...`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Skills Marketplace</h2>
        <p className="text-gray-600">
          Extend your AI Knowledge Companion with third-party skills and plugins
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter by category:</span>
          <div className="flex space-x-2">
            {['all', 'compliance', 'extraction', 'analysis', 'automation'].map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSkills.map(skill => {
          const isInstalled = installedSkills.has(skill.id)
          
          return (
            <div key={skill.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(skill.category)}`}>
                    {skill.category}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{skill.rating}</span>
                </div>
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{skill.name}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">{skill.description}</p>

              {/* Meta */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>by {skill.author}</span>
                <span>v{skill.version}</span>
              </div>
              <div className="text-xs text-gray-500 mb-4">
                <Download className="w-3 h-3 inline mr-1" />
                {skill.installation_count.toLocaleString()} installs
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                {isInstalled ? (
                  <>
                    <button
                      onClick={() => executeSkill(skill.id)}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Play className="w-4 h-4" />
                      <span>Execute</span>
                    </button>
                    <button className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                      <Settings className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => installSkill(skill.id)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Demo Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Demo Marketplace</h4>
        <p className="text-xs text-blue-800">
          This is a demonstration of the Skills Marketplace. In production, skills would be 
          sourced from third-party developers and include real functionality for document 
          processing, compliance checking, and workflow automation.
        </p>
      </div>
    </div>
  )
}