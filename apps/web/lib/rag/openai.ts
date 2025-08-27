import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
})

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is required')
  }
  
  const response = await openai.embeddings.create({
    model: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
    input: text,
  })
  
  return response.data[0].embedding
}

export async function generateCompletion(
  prompt: string,
  temperature: number = 0.1
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is required')
  }
  
  const response = await openai.chat.completions.create({
    model: process.env.LLM_MODEL || 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are an AI Knowledge Companion assistant. Provide accurate, grounded answers with citations.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature,
    max_tokens: 2000,
  })

  return response.choices[0]?.message?.content || ''
}

export { openai }