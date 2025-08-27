export const config = {
  redis: {
    url: process.env.REDIS_URL || process.env.QUEUE_REDIS_URL || 'redis://localhost:6379',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_companion',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
    llmModel: process.env.LLM_MODEL || 'gpt-4-turbo',
  },
  server: {
    port: parseInt(process.env.WORKER_PORT || '3001'),
    baseUrl: process.env.WORKER_BASE_URL || 'http://localhost:3001',
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY,
  },
  integrations: {
    googleDrive: {
      clientId: process.env.GDRIVE_CLIENT_ID,
      clientSecret: process.env.GDRIVE_CLIENT_SECRET,
    },
    github: {
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_PRIVATE_KEY,
    },
  },
}