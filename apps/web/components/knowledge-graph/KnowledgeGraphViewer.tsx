'use client'

import { useState, useEffect } from 'react'
import { Network, Users, Building, Calendar, FileText, Search, Filter } from 'lucide-react'
import type { Entity, EntityRelationship } from '@ai-companion/shared'

interface KnowledgeGraphViewerProps {
  orgId: string
}

interface GraphData {
  entities: Record<string, Entity>
  relationships: EntityRelationship[]
}

export default function KnowledgeGraphViewer({ orgId }: KnowledgeGraphViewerProps) {
  const [graphData, setGraphData] = useState<GraphData>({ entities: {}, relationships: [] })
  const [entitiesByType, setEntitiesByType] = useState<Record<string, Entity[]>>({})
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchEntitiesByType()
  }, [orgId])

  const fetchEntitiesByType = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/knowledge-graph?org_id=${orgId}`)
      const data = await response.json()
      setEntitiesByType(data.entities_by_type || {})
    } catch (error) {
      console.error('Failed to fetch entities:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchEntities = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        org_id: orgId,
        query: searchQuery,
        limit: '20'
      })
      
      if (filterType !== 'all') {
        params.append('entity_types', filterType)
      }

      const response = await fetch(`/api/knowledge-graph?${params}`)
      const data = await response.json()
      
      // Convert array to entities by type format for display
      const entitiesByTypeResult: Record<string, Entity[]> = {}
      data.entities.forEach((entity: Entity) => {
        if (!entitiesByTypeResult[entity.type]) {
          entitiesByTypeResult[entity.type] = []
        }
        entitiesByTypeResult[entity.type].push(entity)
      })
      
      setEntitiesByType(entitiesByTypeResult)
    } catch (error) {
      console.error('Failed to search entities:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadEntityGraph = async (entityId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/knowledge-graph/graph?entity_id=${entityId}&org_id=${orgId}&depth=2`)
      const data = await response.json()
      setGraphData(data)
      setSelectedEntity(data.entities[entityId])
    } catch (error) {
      console.error('Failed to load entity graph:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEntityIcon = (type: Entity['type']) => {
    switch (type) {
      case 'person': return <Users className="w-4 h-4" />
      case 'project': return <Building className="w-4 h-4" />
      case 'deadline': return <Calendar className="w-4 h-4" />
      case 'document': return <FileText className="w-4 h-4" />
      default: return <Network className="w-4 h-4" />
    }
  }

  const getEntityColor = (type: Entity['type']) => {
    switch (type) {
      case 'person': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'project': return 'bg-green-100 text-green-800 border-green-200'
      case 'deadline': return 'bg-red-100 text-red-800 border-red-200'
      case 'document': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'spec': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'task': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRelationshipLabel = (type: EntityRelationship['relationship_type']) => {
    switch (type) {
      case 'works_on': return 'works on'
      case 'deadline_for': return 'deadline for'
      case 'references': return 'references'
      case 'depends_on': return 'depends on'
      default: return type
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search entities by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchEntities()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="person">People</option>
              <option value="project">Projects</option>
              <option value="document">Documents</option>
              <option value="deadline">Deadlines</option>
              <option value="spec">Specifications</option>
              <option value="task">Tasks</option>
            </select>
          </div>
          <button
            onClick={searchEntities}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entities by Type */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Network className="w-5 h-5 mr-2" />
            Knowledge Graph
          </h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Loading entities...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(entitiesByType).map(([type, entities]) => (
                <div key={type} className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 capitalize flex items-center">
                    {getEntityIcon(type as Entity['type'])}
                    <span className="ml-2">{type}s ({entities.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {entities.map((entity) => (
                      <div
                        key={entity.id}
                        onClick={() => loadEntityGraph(entity.id)}
                        className={`p-2 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${getEntityColor(entity.type)}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{entity.name}</span>
                          {entity.confidence && (
                            <span className="text-xs opacity-75">
                              {Math.round(entity.confidence * 100)}%
                            </span>
                          )}
                        </div>
                        {entity.description && (
                          <p className="text-xs opacity-75 mt-1 line-clamp-2">
                            {entity.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {Object.keys(entitiesByType).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No entities found. Try uploading some documents or adjusting your search.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Entity Details and Relationships */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Entity Relationships
          </h3>
          
          {selectedEntity ? (
            <div className="space-y-4">
              {/* Selected Entity */}
              <div className={`p-4 rounded-lg border ${getEntityColor(selectedEntity.type)}`}>
                <div className="flex items-center space-x-2 mb-2">
                  {getEntityIcon(selectedEntity.type)}
                  <h4 className="font-semibold">{selectedEntity.name}</h4>
                </div>
                {selectedEntity.description && (
                  <p className="text-sm opacity-75">{selectedEntity.description}</p>
                )}
                {selectedEntity.properties && Object.keys(selectedEntity.properties).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(selectedEntity.properties).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <span className="font-medium">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Relationships */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Connected Entities</h5>
                {graphData.relationships.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {graphData.relationships.map((rel) => {
                      const isOutgoing = rel.source_entity_id === selectedEntity.id
                      const connectedEntityId = isOutgoing ? rel.target_entity_id : rel.source_entity_id
                      const connectedEntity = graphData.entities[connectedEntityId]
                      
                      if (!connectedEntity) return null

                      return (
                        <div
                          key={rel.id}
                          onClick={() => loadEntityGraph(connectedEntity.id)}
                          className="p-2 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            {getEntityIcon(connectedEntity.type)}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm">
                                <span className="font-medium">{connectedEntity.name}</span>
                                <span className="text-gray-500 mx-2">
                                  {isOutgoing ? '→' : '←'} {getRelationshipLabel(rel.relationship_type)}
                                </span>
                              </div>
                              {rel.weight && (
                                <div className="text-xs text-gray-500">
                                  Strength: {Math.round(rel.weight * 100)}%
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No relationships found for this entity.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Click on an entity to explore its relationships</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}