'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Brain, TrendingUp, Users, Lightbulb, Target, BookOpen, User } from 'lucide-react'

interface LearningInsights {
  skillProgression: Array<{skill: string, level: number, velocity: number}>
  recommendedNextSteps: string[]
  learningGaps: string[]
  expertiseAreas: string[]
}

interface PersonalizedSuggestion {
  type: 'learning' | 'expertise' | 'collaboration' | 'efficiency'
  suggestion: string
  impact_score: number
  personalized_reasoning: string
}

export function IndividualLearningDashboard() {
  const { user } = useAuth()
  const [learningInsights, setLearningInsights] = useState<LearningInsights | null>(null)
  const [personalizedSuggestions, setPersonalizedSuggestions] = useState<PersonalizedSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    if (user) {
      loadLearningData()
    }
  }, [user])

  const loadLearningData = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // For now, use mock data until API endpoints are implemented
      setUserProfile({
        user_id: user.id,
        role: user.role,
        expertise_areas: ['Software Development', 'Project Management'],
        learning_patterns: { preference: 'visual', pace: 'fast' },
        query_history_analysis: { technical_queries: 65, procedural_queries: 35 }
      })

      const insights = {
        skillProgression: [
          { skill: 'TypeScript', level: 75, velocity: 8 },
          { skill: 'React', level: 85, velocity: 5 },
          { skill: 'Database Design', level: 60, velocity: 12 }
        ],
        recommendedNextSteps: [
          'Practice advanced TypeScript patterns',
          'Learn GraphQL integration',
          'Study microservices architecture'
        ],
        learningGaps: [
          'DevOps practices',
          'Testing strategies'
        ],
        expertiseAreas: [
          'Frontend Development',
          'API Design'
        ]
      }
      setLearningInsights(insights)

      const suggestions = [
        {
          type: 'learning' as const,
          suggestion: 'Based on your recent queries, consider diving deeper into advanced React patterns',
          impact_score: 0.85,
          personalized_reasoning: 'You show strong React fundamentals but could benefit from hooks optimization'
        },
        {
          type: 'efficiency' as const,
          suggestion: 'Your TypeScript usage could be enhanced with utility types',
          impact_score: 0.72,
          personalized_reasoning: 'You frequently ask about type definitions, suggesting utility types would help'
        }
      ]
      setPersonalizedSuggestions(suggestions)

    } catch (error) {
      console.error('Error loading learning data:', error)
    } finally {
      setLoading(false)
    }
  }

  const simulateInteraction = async (queryType: string) => {
    if (!user) return

    const sampleQueries = {
      'technical': 'How do I implement OAuth 2.0 authentication in our React application?',
      'procedural': 'What are the steps for conducting a safety inspection on construction equipment?',
      'analytical': 'Can you analyze the performance metrics from our last quarter and identify improvement areas?',
      'management': 'How should I structure the project timeline for the new product launch?'
    }

    const query = sampleQueries[queryType as keyof typeof sampleQueries] || sampleQueries.technical
    const mockResponse = `Based on your ${user.role} role and expertise in ${userProfile?.primary_role || 'general'} areas, here's a personalized response...`

    // TODO: Implement API call to record interaction
    console.log('Recording interaction:', { query, mockResponse })

    // Reload data to show updates
    await loadLearningData()
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 animate-pulse" />
          <h2 className="text-2xl font-bold">Loading Individual Learning Profile...</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'learning': return <BookOpen className="h-4 w-4" />
      case 'expertise': return <Target className="h-4 w-4" />
      case 'collaboration': return <Users className="h-4 w-4" />
      case 'efficiency': return <TrendingUp className="h-4 w-4" />
      default: return <Lightbulb className="h-4 w-4" />
    }
  }

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'learning': return 'bg-blue-100 text-blue-800'
      case 'expertise': return 'bg-green-100 text-green-800'
      case 'collaboration': return 'bg-purple-100 text-purple-800'
      case 'efficiency': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Individual Learning Profile</h2>
            <p className="text-gray-600">AI adaptation based on your unique work patterns and expertise</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          {user.role.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* User Profile Summary */}
      {userProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Learning Profile Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {userProfile.primary_role || 'Detecting...'}
                </div>
                <div className="text-sm text-gray-500">Detected Role</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(userProfile.satisfaction_score * 100)}%
                </div>
                <div className="text-sm text-gray-500">Satisfaction Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(userProfile.engagement_level * 100)}%
                </div>
                <div className="text-sm text-gray-500">Engagement Level</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {userProfile.preferred_response_length}
                </div>
                <div className="text-sm text-gray-500">Response Style</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="skills" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="skills">Skill Progression</TabsTrigger>
          <TabsTrigger value="expertise">Expertise Areas</TabsTrigger>
          <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
          <TabsTrigger value="demo">Live Demo</TabsTrigger>
        </TabsList>

        <TabsContent value="skills" className="space-y-6">
          {learningInsights?.skillProgression && learningInsights.skillProgression.length > 0 ? (
            <div className="grid gap-4">
              {learningInsights.skillProgression.map((skill, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{skill.skill}</span>
                      <Badge variant="outline">
                        Level {Math.round(skill.level * 100)}%
                      </Badge>
                    </div>
                    <Progress value={skill.level * 100} className="mb-2" />
                    <div className="text-sm text-gray-500">
                      Learning velocity: {(skill.velocity * 100).toFixed(1)}% per month
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Building Your Skill Profile</h3>
                <p className="text-gray-600 mb-4">
                  The AI is learning about your skills and expertise. Interact with the system to build your personalized profile.
                </p>
                <Button onClick={() => simulateInteraction('technical')}>
                  Simulate Technical Question
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expertise" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <span>Your Expertise Areas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {learningInsights?.expertiseAreas && learningInsights.expertiseAreas.length > 0 ? (
                  <div className="space-y-2">
                    {learningInsights.expertiseAreas.map((area, index) => (
                      <Badge key={index} className="mr-2 mb-2">
                        {area}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Expertise areas will appear as the AI learns from your interactions.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <span>Learning Opportunities</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {learningInsights?.learningGaps && learningInsights.learningGaps.length > 0 ? (
                  <div className="space-y-2">
                    {learningInsights.learningGaps.map((gap, index) => (
                      <div key={index} className="p-2 bg-orange-50 rounded border-l-4 border-orange-400">
                        <span className="text-sm font-medium">{gap}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No learning gaps identified yet. The AI will suggest areas for growth as it learns more about your role.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {learningInsights?.recommendedNextSteps && learningInsights.recommendedNextSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  <span>Recommended Next Steps</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {learningInsights.recommendedNextSteps.map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <p className="text-sm">{step}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-6">
          {personalizedSuggestions.length > 0 ? (
            <div className="space-y-4">
              {personalizedSuggestions.map((suggestion, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Badge className={`${getSuggestionColor(suggestion.type)} border-0`}>
                        <div className="flex items-center space-x-1">
                          {getSuggestionIcon(suggestion.type)}
                          <span className="capitalize">{suggestion.type}</span>
                        </div>
                      </Badge>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{suggestion.suggestion}</h4>
                        <p className="text-sm text-gray-600 mb-2">{suggestion.personalized_reasoning}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Impact Score:</span>
                          <Progress value={suggestion.impact_score * 100} className="w-20 h-2" />
                          <span className="text-xs font-medium">{Math.round(suggestion.impact_score * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Personalized Suggestions Coming Soon</h3>
                <p className="text-gray-600">
                  As you interact more with the AI, it will provide personalized suggestions to improve your productivity and learning.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="demo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Learning Demo</CardTitle>
              <p className="text-sm text-gray-600">
                Simulate different types of interactions to see how the AI learns and adapts to your individual patterns.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => simulateInteraction('technical')}
                  className="flex flex-col items-center p-4 h-auto"
                >
                  <Brain className="h-6 w-6 mb-2" />
                  <span className="text-xs">Technical Query</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => simulateInteraction('procedural')}
                  className="flex flex-col items-center p-4 h-auto"
                >
                  <BookOpen className="h-6 w-6 mb-2" />
                  <span className="text-xs">Procedural Query</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => simulateInteraction('analytical')}
                  className="flex flex-col items-center p-4 h-auto"
                >
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span className="text-xs">Analytical Query</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => simulateInteraction('management')}
                  className="flex flex-col items-center p-4 h-auto"
                >
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-xs">Management Query</span>
                </Button>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How Individual Learning Works:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Role Detection:</strong> AI identifies your primary work role based on query patterns</li>
                  <li>• <strong>Expertise Mapping:</strong> Tracks areas where you demonstrate knowledge and skill</li>
                  <li>• <strong>Response Adaptation:</strong> Customizes answer style, detail level, and citations to your preferences</li>
                  <li>• <strong>Learning Velocity:</strong> Monitors how quickly you're acquiring new knowledge in different areas</li>
                  <li>• <strong>Collaboration Insights:</strong> Identifies opportunities to share your expertise with teammates</li>
                  <li>• <strong>Personalized Recommendations:</strong> Suggests learning paths and efficiency improvements</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default IndividualLearningDashboard