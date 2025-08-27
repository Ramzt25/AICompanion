const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_companion'
  })

  try {
    await client.connect()
    console.log('Connected to database')

    // Read migration files
    const migrationsDir = path.join(__dirname, '../migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      console.log(`Running migration: ${file}`)
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      await client.query(sql)
      console.log(`✓ ${file} completed`)
    }

    console.log('All migrations completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigrations()