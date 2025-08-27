const { Client } = require('pg')
const { v4: uuidv4 } = require('uuid')

async function seedDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_companion'
  })

  try {
    await client.connect()
    console.log('Connected to database for seeding')

    // Create demo organization
    const orgId = uuidv4()
    await client.query(`
      INSERT INTO orgs (id, name, plan, policies_json)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `, [orgId, 'Demo Organization', 'pro', { 
      data_retention_days: 365,
      allowed_domains: ['example.com'],
      pii_redaction: true 
    }])

    // Create demo admin user
    const adminId = uuidv4()
    await client.query(`
      INSERT INTO users (id, email, name, org_id, role, settings_json)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, [adminId, 'admin@demo.com', 'Demo Admin', orgId, 'admin', {
      timezone: 'America/Chicago',
      preferred_vendors: ['Phoenix Metals'],
      notification_preferences: { email: true, slack: false }
    }])

    // Create demo member user
    const memberId = uuidv4()
    await client.query(`
      INSERT INTO users (id, email, name, org_id, role, settings_json)  
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, [memberId, 'member@demo.com', 'Demo Member', orgId, 'member', {
      timezone: 'America/Chicago'
    }])

    // Create demo sources
    const driveSourceId = uuidv4()
    await client.query(`
      INSERT INTO sources (id, org_id, type, display_name, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `, [driveSourceId, orgId, 'google_drive', 'Demo Google Drive', 'active'])

    const githubSourceId = uuidv4()
    await client.query(`
      INSERT INTO sources (id, org_id, type, display_name, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING  
    `, [githubSourceId, orgId, 'github', 'Demo GitHub', 'active'])

    // Create demo documents
    const docId1 = uuidv4()
    await client.query(`
      INSERT INTO documents (id, source_id, uri, title, hash, meta_json)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [docId1, driveSourceId, 'https://docs.google.com/document/d/demo1', 'Lighting Plan REV B', 'hash1', {
      filetype: 'document',
      size: 1024,
      last_modified: new Date().toISOString()
    }])

    const docId2 = uuidv4()
    await client.query(`
      INSERT INTO documents (id, source_id, uri, title, hash, meta_json)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [docId2, driveSourceId, 'https://docs.google.com/document/d/demo2', 'Electrical Spec v3', 'hash2', {
      filetype: 'document', 
      size: 2048,
      last_modified: new Date().toISOString()
    }])

    // Create demo chunks with sample text (no embeddings for now)
    const chunkId1 = uuidv4()
    await client.query(`
      INSERT INTO chunks (id, document_id, text, token_count, meta_json)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `, [chunkId1, docId1, 'The lighting plan revision B includes updated LED specifications for the main floor. Key changes include higher efficacy requirements and new dimming controls.', 150, {
      chunk_index: 0,
      source_page: 1
    }])

    const chunkId2 = uuidv4()
    await client.query(`
      INSERT INTO chunks (id, document_id, text, token_count, meta_json)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `, [chunkId2, docId2, 'Electrical specification version 3 introduces aluminum feeder requirements per NEC updates. All feeders must comply with new grounding standards.', 140, {
      chunk_index: 0,
      source_page: 1
    }])

    // Create demo memories
    await client.query(`
      INSERT INTO memories (subject_type, subject_id, kind, content, confidence)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `, ['user', adminId, 'preference', 'Prefers Phoenix Metals as primary vendor for electrical components', 0.95])

    await client.query(`
      INSERT INTO memories (subject_type, subject_id, kind, content, confidence)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `, ['org', orgId, 'fact', 'Company timezone is America/Chicago', 1.0])

    // Create demo automation
    await client.query(`
      INSERT INTO automations (owner_id, org_id, prompt, schedule, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `, [adminId, orgId, 'Every Monday 8am, send me changes in Electrical Spec v3 since last week', 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=8', 'active'])

    console.log('✓ Demo data seeded successfully')
    console.log(`✓ Organization ID: ${orgId}`)
    console.log(`✓ Admin User ID: ${adminId}`)
    console.log(`✓ Member User ID: ${memberId}`)

  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seedDatabase()