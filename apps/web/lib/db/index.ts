import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export async function withOrgContext<T>(
  orgId: string, 
  userId: string, 
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    // Set RLS context
    await client.query('SET app.org_id = $1', [orgId])
    await client.query('SET app.user_id = $1', [userId])
    
    const result = await callback(client)
    return result
  } finally {
    client.release()
  }
}

export { pool }