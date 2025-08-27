'use client'

import { useState } from 'react'
import { Upload, Brain, Settings, Download, Play, Pause, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface TrainingSession {
  id: string
  name: string
  status: 'preparing' | 'training' | 'completed' | 'failed'
  industry: string
  datasetSize: number
  accuracy?: number
  createdAt: string
  completedAt?: string
}

interface EnterpriseTrainingProps {
  orgId: string
}

export default function EnterpriseTraining({ orgId }: EnterpriseTrainingProps) {
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([
    {
      id: '1',
      name: 'Construction Safety Model',
      status: 'completed',
      industry: 'Construction',
      datasetSize: 15000,
      accuracy: 94.2,
      createdAt: '2024-01-15',
      completedAt: '2024-01-16'
    },
    {
      id: '2', 
      name: 'Legal Contract Analysis',
      status: 'training',
      industry: 'Legal',
      datasetSize: 8500,
      createdAt: '2024-01-18'
    }
  ])

  const [showNewTraining, setShowNewTraining] = useState(false)
  const [newTraining, setNewTraining] = useState({
    name: '',
    industry: '',
    description: ''
  })

  const industries = [
    'Construction & Engineering',
    'Legal Services', 
    'Healthcare',
    'Manufacturing',
    'Financial Services',
    'Technology',
    'Real Estate',
    'Consulting',
    'Other'
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'training':
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'training':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCreateTraining = () => {
    const newSession: TrainingSession = {
      id: Date.now().toString(),
      name: newTraining.name,
      status: 'preparing',
      industry: newTraining.industry,
      datasetSize: 0,
      createdAt: new Date().toISOString().split('T')[0]
    }
    
    setTrainingSessions(prev => [...prev, newSession])
    setNewTraining({ name: '', industry: '', description: '' })
    setShowNewTraining(false)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Enterprise AI Training</h1>
        <p className="text-gray-600">
          Train custom AI models specific to your industry and organizational knowledge.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Brain className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Active Models</p>
              <p className="text-2xl font-bold text-gray-900">
                {trainingSessions.filter(s => s.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">In Training</p>
              <p className="text-2xl font-bold text-gray-900">
                {trainingSessions.filter(s => s.status === 'training').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Upload className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">
                {trainingSessions.reduce((sum, s) => sum + s.datasetSize, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Accuracy</p>
              <p className="text-2xl font-bold text-gray-900">
                {trainingSessions.filter(s => s.accuracy).length > 0 
                  ? Math.round(trainingSessions.filter(s => s.accuracy).reduce((sum, s) => sum + (s.accuracy || 0), 0) / trainingSessions.filter(s => s.accuracy).length) 
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Training Sessions</h2>
        <button
          onClick={() => setShowNewTraining(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Brain className="h-4 w-4" />
          <span>New Training Session</span>
        </button>
      </div>

      {/* New Training Modal */}
      {showNewTraining && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Training Session</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Name
                </label>
                <input
                  type="text"
                  value={newTraining.name}
                  onChange={(e) => setNewTraining(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Construction Safety Model"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <select
                  value={newTraining.industry}
                  onChange={(e) => setNewTraining(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Industry</option>
                  {industries.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTraining.description}
                  onChange={(e) => setNewTraining(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe what this model will be trained for..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewTraining(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTraining}
                disabled={!newTraining.name || !newTraining.industry}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Training Sessions List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dataset Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Accuracy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trainingSessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(session.status)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{session.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.industry}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.datasetSize.toLocaleString()} docs
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.accuracy ? `${session.accuracy}%` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {session.status === 'completed' && (
                        <>
                          <button className="text-blue-600 hover:text-blue-900">
                            <Download className="h-4 w-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            <Play className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {session.status === 'training' && (
                        <button className="text-orange-600 hover:text-orange-900">
                          <Pause className="h-4 w-4" />
                        </button>
                      )}
                      <button className="text-gray-600 hover:text-gray-900">
                        <Settings className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Training Guide */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Enterprise AI Training Guide</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-semibold text-xs">1</span>
            <div>
              <strong>Upload Training Data:</strong> Provide domain-specific documents, manuals, and knowledge bases for your industry.
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-semibold text-xs">2</span>
            <div>
              <strong>Configure Training:</strong> Select industry templates and customize training parameters for your use case.
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-semibold text-xs">3</span>
            <div>
              <strong>Monitor Progress:</strong> Track training metrics and validate model performance with test queries.
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-semibold text-xs">4</span>
            <div>
              <strong>Deploy & Iterate:</strong> Activate your custom model and continuously improve with user feedback.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}