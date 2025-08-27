'use client'

import { useState } from 'react'
import { BarChart, Users, FileText, MessageSquare, TrendingUp, AlertTriangle, Calendar } from 'lucide-react'

interface TeamAnalyticsProps {
  orgId: string
}

export default function TeamAnalytics({ orgId }: TeamAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month')
  
  // Demo data
  const analytics = {
    overview: {
      total_queries: 1247,
      total_documents: 156,
      active_users: 12,
      avg_confidence: 0.87
    },
    document_metrics: [
      { name: 'Lighting Plan REV B', views: 89, citations: 34 },
      { name: 'Electrical Specifications', views: 67, citations: 28 },
      { name: 'Safety Protocols Manual', views: 45, citations: 19 },
      { name: 'Project Timeline Q4', views: 38, citations: 15 },
      { name: 'OSHA Compliance Guide', views: 32, citations: 12 }
    ],
    knowledge_gaps: [
      { topic: 'HVAC', question_count: 15, bad_feedback_ratio: 65 },
      { topic: 'Electrical', question_count: 12, bad_feedback_ratio: 58 },
      { topic: 'Plumbing', question_count: 8, bad_feedback_ratio: 75 },
      { topic: 'Foundation', question_count: 6, bad_feedback_ratio: 50 }
    ],
    user_activity: [
      { name: 'Sarah Chen', queries: 156, satisfaction: 92 },
      { name: 'Mike Rodriguez', queries: 134, satisfaction: 88 },
      { name: 'Jennifer Kim', queries: 98, satisfaction: 95 },
      { name: 'David Park', queries: 87, satisfaction: 84 },
      { name: 'Lisa Wang', queries: 76, satisfaction: 90 }
    ],
    query_trends: [
      { date: '2024-01-01', count: 45 },
      { date: '2024-01-02', count: 52 },
      { date: '2024-01-03', count: 38 },
      { date: '2024-01-04', count: 61 },
      { date: '2024-01-05', count: 49 },
      { date: '2024-01-06', count: 58 },
      { date: '2024-01-07', count: 43 }
    ]
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    color = 'blue' 
  }: { 
    title: string
    value: string | number
    icon: any
    trend?: string
    color?: string
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-xs text-green-600 mt-1">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Analytics</h2>
            <p className="text-gray-600">
              Organizational insights and knowledge usage patterns
            </p>
          </div>
          <div className="flex space-x-2">
            {(['week', 'month', 'quarter'] as const).map(period => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeframe === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Queries"
          value={analytics.overview.total_queries.toLocaleString()}
          icon={MessageSquare}
          trend="+12% vs last month"
          color="blue"
        />
        <StatCard
          title="Documents"
          value={analytics.overview.total_documents}
          icon={FileText}
          trend="+5 new this month"
          color="green"
        />
        <StatCard
          title="Active Users"
          value={analytics.overview.active_users}
          icon={Users}
          trend="+2 vs last month"
          color="purple"
        />
        <StatCard
          title="Avg Confidence"
          value={`${Math.round(analytics.overview.avg_confidence * 100)}%`}
          icon={TrendingUp}
          trend="+3% improvement"
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Accessed Documents */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Most Accessed Documents
          </h3>
          <div className="space-y-3">
            {analytics.document_metrics.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-500">{doc.views} views • {doc.citations} citations</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(doc.views / 100) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 w-8">{doc.views}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Knowledge Gaps */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
            Knowledge Gaps
          </h3>
          <div className="space-y-3">
            {analytics.knowledge_gaps.map((gap, index) => (
              <div key={index} className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{gap.topic}</p>
                    <p className="text-xs text-gray-600">{gap.question_count} questions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{gap.bad_feedback_ratio}%</p>
                    <p className="text-xs text-gray-500">poor feedback</p>
                  </div>
                </div>
                <div className="mt-2 w-full bg-red-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ width: `${gap.bad_feedback_ratio}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Recommendation:</strong> Consider adding more documentation or training materials 
              for topics with high negative feedback ratios.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Most Active Users
          </h3>
          <div className="space-y-3">
            {analytics.user_activity.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.queries} queries</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">{user.satisfaction}%</p>
                  <p className="text-xs text-gray-500">satisfaction</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Query Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart className="w-5 h-5 mr-2" />
            Query Trends (Last 7 Days)
          </h3>
          <div className="space-y-2">
            {analytics.query_trends.map((day, index) => {
              const maxCount = Math.max(...analytics.query_trends.map(d => d.count))
              const percentage = (day.count / maxCount) * 100
              
              return (
                <div key={index} className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500 w-12">
                    {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                    <div 
                      className="bg-blue-600 h-4 rounded-full flex items-center justify-end pr-2" 
                      style={{ width: `${percentage}%` }}
                    >
                      <span className="text-xs text-white font-medium">{day.count}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI-Generated Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-sm font-semibold text-green-900 mb-2">📈 Positive Trend</h4>
            <p className="text-sm text-green-800">
              Query satisfaction has improved by 15% this month. The new Lighting Plan REV B document 
              is receiving excellent feedback and high citation rates.
            </p>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Action Needed</h4>
            <p className="text-sm text-yellow-800">
              HVAC-related queries have a 65% negative feedback rate. Consider adding more detailed 
              HVAC specifications or technical drawings to improve answer quality.
            </p>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Opportunity</h4>
            <p className="text-sm text-blue-800">
              Power users like Sarah and Mike could benefit from automation features. Consider setting up 
              weekly digest automations for frequently asked project questions.
            </p>
          </div>
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="text-sm font-semibold text-purple-900 mb-2">🎯 Goal Progress</h4>
            <p className="text-sm text-purple-800">
              You're 87% towards your goal of 90% average confidence. Focus on improving responses 
              for foundation and plumbing topics to reach the target.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}