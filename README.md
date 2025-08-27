# AI Knowledge Companion

A personal and team-aware AI assistant that combines Retrieval-Augmented Generation (RAG), long-term memory, tool use, and automations to deliver accurate, cited answers from your private documents.

![AI Knowledge Companion Interface](https://github.com/user-attachments/assets/2ac74f80-9063-4699-8e16-41ded09678c0)

## Features

- **🔍 RAG with Citations**: Get accurate answers with source citations from your documents
- **🧠 Long-term Memory**: Remember user preferences and organizational knowledge
- **🔗 Tool Integrations**: Connect Google Drive, GitHub, and other data sources
- **⚡ Automations**: Schedule recurring digests and alerts
- **🏢 Multi-tenant**: Organization-level data isolation and governance
- **🔒 Security**: Row-level security, audit logging, and data governance

## Architecture

```
Client (Next.js)  ←→  API Gateway (Next.js API)
                        │
                        ├─ RAG Pipeline
                        │    ├─ Chunker → Embedder → Vector DB (pgvector)
                        │    └─ Re-Ranker → Grounded Generation
                        │
                        ├─ Doc Connectors (Drive/GitHub/Slack)
                        ├─ Automations Scheduler
                        └─ Audit/Analytics (Postgres)
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL with pgvector extension
- Redis (for job queues)
- OpenAI API key

### 1. Environment Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd AICompanion
pnpm install

# Copy environment template
cp .env.example .env.local
```

### 2. Configure Environment

Edit `.env.local` with your settings:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_companion

# OpenAI
OPENAI_API_KEY=your-openai-api-key-here

# Redis
REDIS_URL=redis://localhost:6379

# Other configurations...
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose -f infra/docker-compose.yml up -d

# Run database migrations
pnpm db:migrate

# Seed demo data
pnpm db:seed
```

### 4. Start Development

```bash
# Start all services
pnpm dev
```

Visit http://localhost:3000 to see the application.

## Usage

### Basic Chat

1. Open the application
2. Type a question about your documents
3. Get grounded answers with citations
4. Click citations to view source documents

### Document Ingestion

```bash
# Ingest documents via API
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"source_id": "your-source-id", "full_resync": false}'
```

### Example Queries

- "What changed in the Lighting Plan REV B?"
- "Summarize the electrical specification requirements"
- "What are the key safety protocols?"

## Development

### Project Structure

```
apps/
  web/           # Next.js web application
  worker/        # Background job processor (planned)
packages/
  shared/        # Shared types and utilities
  db/           # Database migrations and scripts
infra/          # Docker and deployment configs
```

### Key Technologies

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, PostgreSQL + pgvector
- **AI**: OpenAI GPT-4, text-embedding-3-large
- **Queue**: BullMQ (planned)
- **Validation**: Zod schemas

### Available Scripts

```bash
pnpm dev          # Start development servers
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm type-check   # TypeScript type checking
pnpm db:migrate   # Run database migrations
pnpm db:seed      # Seed demo data
```

## Deployment

### Production Build

```bash
pnpm build
pnpm start
```

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d
```

### Environment Variables

See `.env.example` for all required environment variables.

## Security

- **Row-Level Security**: Multi-tenant data isolation
- **Audit Logging**: All operations logged
- **Input Validation**: Zod schema validation
- **API Security**: Rate limiting and authentication ready

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review example implementations
