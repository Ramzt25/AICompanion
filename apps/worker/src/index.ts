import { Worker, Queue, QueueEvents } from 'bullmq'
import Redis from 'ioredis'
import { Pool } from 'pg'
import { config } from './config'
import { DocumentProcessor } from './processors/document-processor'
import { EmbeddingProcessor } from './processors/embedding-processor'
import { AutomationProcessor } from './processors/automation-processor'
import { TrainingProcessor } from './processors/training-processor'
import { AnalyticsProcessor } from './processors/analytics-processor'

// Redis connection
const connection = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
})

// Database connection
const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.database.ssl,
})

// Queue definitions
export const queues = {
  documentProcessing: new Queue('document-processing', { connection }),
  embedding: new Queue('embedding', { connection }),
  automation: new Queue('automation', { connection }),
  training: new Queue('training', { connection }),
  analytics: new Queue('analytics', { connection }),
}

// Worker classes
class AICompanionWorker {
  private workers: Worker[] = []
  private queueEvents: QueueEvents[] = []

  async start() {
    console.log('🚀 Starting AI Companion Worker System...')

    // Document Processing Worker
    const documentWorker = new Worker(
      'document-processing',
      async (job) => {
        const processor = new DocumentProcessor(pool)
        return await processor.process(job.data)
      },
      { 
        connection,
        concurrency: 5,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    )

    // Embedding Generation Worker
    const embeddingWorker = new Worker(
      'embedding',
      async (job) => {
        const processor = new EmbeddingProcessor(pool)
        return await processor.process(job.data)
      },
      { 
        connection,
        concurrency: 3,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    )

    // Automation Worker
    const automationWorker = new Worker(
      'automation',
      async (job) => {
        const processor = new AutomationProcessor(pool)
        return await processor.process(job.data)
      },
      { 
        connection,
        concurrency: 2,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    )

    // Training Worker
    const trainingWorker = new Worker(
      'training',
      async (job) => {
        const processor = new TrainingProcessor(pool)
        return await processor.process(job.data)
      },
      { 
        connection,
        concurrency: 1, // CPU intensive, run one at a time
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 25 },
      }
    )

    // Analytics Worker
    const analyticsWorker = new Worker(
      'analytics',
      async (job) => {
        const processor = new AnalyticsProcessor(pool)
        return await processor.process(job.data)
      },
      { 
        connection,
        concurrency: 5,
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      }
    )

    this.workers = [
      documentWorker,
      embeddingWorker,
      automationWorker,
      trainingWorker,
      analyticsWorker
    ]

    // Set up event listeners
    this.setupEventListeners()

    // Set up error handling
    this.setupErrorHandling()

    console.log('✅ All workers started successfully')
    console.log(`📊 Running ${this.workers.length} workers with Redis at ${config.redis.url}`)
  }

  private setupEventListeners() {
    Object.entries(queues).forEach(([name, queue]) => {
      const queueEvents = new QueueEvents(queue.name, { connection })
      this.queueEvents.push(queueEvents)

      queueEvents.on('completed', ({ jobId, returnvalue }) => {
        console.log(`✅ Job ${jobId} completed in ${name} queue`)
      })

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        console.error(`❌ Job ${jobId} failed in ${name} queue:`, failedReason)
      })

      queueEvents.on('stalled', ({ jobId }) => {
        console.warn(`⚠️ Job ${jobId} stalled in ${name} queue`)
      })
    })
  }

  private setupErrorHandling() {
    this.workers.forEach((worker, index) => {
      worker.on('error', (error) => {
        console.error(`🚨 Worker ${index} error:`, error)
      })

      worker.on('failed', (job, error) => {
        console.error(`💥 Job ${job?.id} failed in worker ${index}:`, error)
      })
    })

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown())
    process.on('SIGTERM', () => this.shutdown())
  }

  private async shutdown() {
    console.log('🛑 Shutting down workers...')

    // Close all workers
    await Promise.all(this.workers.map(worker => worker.close()))
    
    // Close queue events
    await Promise.all(this.queueEvents.map(qe => qe.close()))
    
    // Close connections
    await connection.quit()
    await pool.end()

    console.log('✅ Graceful shutdown completed')
    process.exit(0)
  }
}

// Start the worker system
if (require.main === module) {
  const worker = new AICompanionWorker()
  worker.start().catch((error) => {
    console.error('❌ Failed to start worker system:', error)
    process.exit(1)
  })
}

export { AICompanionWorker }