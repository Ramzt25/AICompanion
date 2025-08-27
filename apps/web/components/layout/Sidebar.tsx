'use client'

import { useState } from 'react'
import { 
  MessageSquare, 
  Database, 
  Settings, 
  Zap, 
  FileText,
  Plus,
  ChevronRight,
  Clock,
  Network,
  Puzzle,
  BarChart,
  CreditCard
} from 'lucide-react'

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {

  const menuItems = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'sources', label: 'Sources', icon: Database },
    { id: 'automations', label: 'Automations', icon: Zap },
    { id: 'knowledge-graph', label: 'Knowledge Graph', icon: Network },
    { id: 'skills', label: 'Skills Marketplace', icon: Puzzle },
    { id: 'analytics', label: 'Analytics', icon: BarChart },
    { id: 'memories', label: 'Memory', icon: FileText },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const recentThreads = [
    { id: '1', title: 'Lighting Plan REV B changes', time: '2 hours ago' },
    { id: '2', title: 'Electrical spec requirements', time: '1 day ago' },
    { id: '3', title: 'Safety protocol updates', time: '3 days ago' },
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">AI Companion</h1>
        <p className="text-xs text-gray-500">Demo Organization</p>
      </div>

      {/* Navigation */}
      <nav className="p-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Recent Threads */}
      <div className="flex-1 p-2">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Recent Threads
          </h3>
          <button className="p-1 hover:bg-gray-100 rounded">
            <Plus className="h-3 w-3 text-gray-400" />
          </button>
        </div>
        
        <ul className="space-y-1">
          {recentThreads.map((thread) => (
            <li key={thread.id}>
              <button className="w-full text-left p-2 hover:bg-gray-50 rounded-md group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate group-hover:text-blue-600">
                      {thread.title}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{thread.time}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-white">DA</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">Demo Admin</p>
            <p className="text-xs text-gray-500 truncate">admin@demo.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}