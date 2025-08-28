-- Insert demo organization and user
INSERT INTO orgs (id, name, plan, created_at)
VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Demo Organization', 'enterprise', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, name, org_id, role, password_hash, email_verified, settings_json, created_at)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d480', 
  'demo@example.com', 
  'Demo User', 
  'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
  'admin', 
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBqd5iCGjqrDSu', -- password: 'demo123'
  true,
  '{"theme": "auto", "notifications": true, "aiPersonality": "professional", "language": "en", "timezone": "UTC"}',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo source
INSERT INTO sources (id, org_id, type, display_name, status, created_at)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d481',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'web',
  'Demo Knowledge Base',
  'active',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo documents
INSERT INTO documents (id, source_id, uri, title, hash, meta_json, created_at)
VALUES 
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d482',
  'f47ac10b-58cc-4372-a567-0e02b2c3d481',
  'https://example.com/ai-basics',
  'Introduction to AI and Machine Learning',
  'hash1',
  '{"author": "Demo Author", "category": "AI/ML"}',
  NOW()
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d483', 
  'f47ac10b-58cc-4372-a567-0e02b2c3d481',
  'https://example.com/rag-systems',
  'Building RAG Systems with Vector Databases',
  'hash2',
  '{"author": "Demo Author", "category": "RAG"}',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo chunks (without embeddings for now)
INSERT INTO chunks (id, document_id, text, token_count, meta_json, created_at)
VALUES 
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d484',
  'f47ac10b-58cc-4372-a567-0e02b2c3d482',
  'Artificial Intelligence (AI) is a field of computer science that aims to create intelligent machines capable of performing tasks that typically require human intelligence. Machine Learning is a subset of AI that enables computers to learn and improve from experience without being explicitly programmed.',
  45,
  '{"chunk_index": 0}',
  NOW()
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d485',
  'f47ac10b-58cc-4372-a567-0e02b2c3d482', 
  'Machine Learning algorithms can be categorized into three main types: supervised learning (learns from labeled data), unsupervised learning (finds patterns in unlabeled data), and reinforcement learning (learns through interaction with an environment).',
  42,
  '{"chunk_index": 1}',
  NOW()
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d486',
  'f47ac10b-58cc-4372-a567-0e02b2c3d483',
  'Retrieval-Augmented Generation (RAG) is an AI framework that combines the power of large language models with external knowledge retrieval. RAG systems first retrieve relevant information from a knowledge base, then use that information to generate more accurate and contextual responses.',
  52,
  '{"chunk_index": 0}',
  NOW()
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d487',
  'f47ac10b-58cc-4372-a567-0e02b2c3d483',
  'Vector databases are specialized databases designed to store and query high-dimensional vector embeddings. They enable semantic search by finding vectors that are similar in the embedding space, which is crucial for RAG systems to retrieve contextually relevant information.',
  48,
  '{"chunk_index": 1}',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
