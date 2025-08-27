import { Queue } from 'bullmq'
import Redis from 'ioredis'

// Redis connection for the web app
const connection = new Redis(process.env.REDIS_URL || process.env.QUEUE_REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
})

// Queue instances for enqueuing jobs
export const queues = {
  documentProcessing: new Queue('document-processing', { connection }),
  embedding: new Queue('embedding', { connection }),
  automation: new Queue('automation', { connection }),
  training: new Queue('training', { connection }),
  analytics: new Queue('analytics', { connection }),
}

export class QueueManager {
  // Document processing
  static async enqueueDocumentProcessing(data: {
    sourceId: string
    uri: string
    title: string
    content?: string
    metadata?: Record<string, any>
    orgId: string
    userId: string
  }) {
    return await queues.documentProcessing.add('process-document', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    })
  }

  // Embedding generation
  static async enqueueEmbedding(data: {
    chunkId: string
    text: string
    orgId: string
    userId: string
  }) {
    return await queues.embedding.add('generate-embedding', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    })
  }

  // Batch embedding for multiple chunks
  static async enqueueBatchEmbedding(chunks: Array<{
    chunkId: string
    text: string
    orgId: string
    userId: string
  }>) {
    const jobs = chunks.map(chunk => ({
      name: 'generate-embedding',
      data: chunk,
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    }))

    return await queues.embedding.addBulk(jobs)
  }

  // Automation execution
  static async enqueueAutomation(data: {
    automationId: string
    prompt: string
    schedule: string
    ownerId: string
    orgId: string
    scopes?: string[]
  }) {
    return await queues.automation.add('run-automation', data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    })
  }

  // Schedule recurring automation
  static async scheduleRecurringAutomation(data: {
    automationId: string
    prompt: string
    schedule: string
    ownerId: string
    orgId: string
    scopes?: string[]
  }, cronPattern: string) {
    return await queues.automation.add('run-automation', data, {
      repeat: { pattern: cronPattern },
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    })
  }

  // Training jobs
  static async enqueueTraining(data: {
    organizationId: string
    trainingType: 'custom_model' | 'knowledge_base' | 'skill_training'
    datasetId?: string
    modelName: string
    industryTemplate?: string
    userId: string
  }) {
    return await queues.training.add('training-job', data, {
      attempts: 1, // Training jobs are expensive, don't retry automatically
      delay: 1000, // Small delay to allow for setup
    })
  }

  // Analytics processing
  static async enqueueAnalytics(data: {
    type: 'usage_metrics' | 'user_behavior' | 'document_analytics' | 'knowledge_gaps' | 'team_insights'
    orgId: string
    userId?: string
    timeRange?: {
      start: Date
      end: Date
    }
    filters?: Record<string, any>
  }) {
    return await queues.analytics.add('analytics-job', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    })
  }

  // Schedule daily analytics
  static async scheduleDailyAnalytics(orgId: string) {
    const analyticsTypes = [
      'usage_metrics',
      'user_behavior', 
      'document_analytics',
      'knowledge_gaps',
      'team_insights'
    ] as const

    const jobs = analyticsTypes.map(type => ({
      name: 'analytics-job',
      data: {
        type,
        orgId,
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          end: new Date()
        }
      },
      opts: {
        repeat: { pattern: '0 2 * * *' }, // Run at 2 AM daily
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    }))

    return await queues.analytics.addBulk(jobs)
  }

  // Utility methods
  static async getQueueStatus() {
    const statuses = await Promise.all([
      queues.documentProcessing.getJobCounts(),
      queues.embedding.getJobCounts(),
      queues.automation.getJobCounts(),
      queues.training.getJobCounts(),
      queues.analytics.getJobCounts(),
    ])

    return {
      documentProcessing: statuses[0],
      embedding: statuses[1],
      automation: statuses[2],
      training: statuses[3],
      analytics: statuses[4],
    }
  }

  static async pauseQueue(queueName: keyof typeof queues) {
    await queues[queueName].pause()
  }

  static async resumeQueue(queueName: keyof typeof queues) {
    await queues[queueName].resume()
  }

  static async clearQueue(queueName: keyof typeof queues) {
    await queues[queueName].drain()
  }
}