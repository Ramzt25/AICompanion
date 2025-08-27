import { NextRequest, NextResponse } from 'next/server'
import { QueueManager } from '@/lib/queue-manager'

export async function GET(req: NextRequest) {
  try {
    const status = await QueueManager.getQueueStatus()
    
    return NextResponse.json({
      status: 'success',
      queues: status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting queue status:', error)
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, queueName, jobData } = body

    switch (action) {
      case 'pause':
        if (!queueName) {
          return NextResponse.json(
            { error: 'Queue name is required for pause action' },
            { status: 400 }
          )
        }
        await QueueManager.pauseQueue(queueName)
        return NextResponse.json({ message: `Queue ${queueName} paused` })

      case 'resume':
        if (!queueName) {
          return NextResponse.json(
            { error: 'Queue name is required for resume action' },
            { status: 400 }
          )
        }
        await QueueManager.resumeQueue(queueName)
        return NextResponse.json({ message: `Queue ${queueName} resumed` })

      case 'clear':
        if (!queueName) {
          return NextResponse.json(
            { error: 'Queue name is required for clear action' },
            { status: 400 }
          )
        }
        await QueueManager.clearQueue(queueName)
        return NextResponse.json({ message: `Queue ${queueName} cleared` })

      case 'enqueue_document':
        if (!jobData) {
          return NextResponse.json(
            { error: 'Job data is required' },
            { status: 400 }
          )
        }
        const docJob = await QueueManager.enqueueDocumentProcessing(jobData)
        return NextResponse.json({ 
          message: 'Document processing job enqueued',
          jobId: docJob.id 
        })

      case 'enqueue_training':
        if (!jobData) {
          return NextResponse.json(
            { error: 'Job data is required' },
            { status: 400 }
          )
        }
        const trainingJob = await QueueManager.enqueueTraining(jobData)
        return NextResponse.json({ 
          message: 'Training job enqueued',
          jobId: trainingJob.id 
        })

      case 'enqueue_analytics':
        if (!jobData) {
          return NextResponse.json(
            { error: 'Job data is required' },
            { status: 400 }
          )
        }
        const analyticsJob = await QueueManager.enqueueAnalytics(jobData)
        return NextResponse.json({ 
          message: 'Analytics job enqueued',
          jobId: analyticsJob.id 
        })

      case 'schedule_daily_analytics':
        if (!jobData?.orgId) {
          return NextResponse.json(
            { error: 'Organization ID is required' },
            { status: 400 }
          )
        }
        await QueueManager.scheduleDailyAnalytics(jobData.orgId)
        return NextResponse.json({ 
          message: 'Daily analytics scheduled',
          orgId: jobData.orgId 
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error processing queue action:', error)
    return NextResponse.json(
      { error: 'Failed to process queue action' },
      { status: 500 }
    )
  }
}