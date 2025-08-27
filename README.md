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

## 🚀 Quick Start

### ⚡ One-Command Setup (Recommended)

**Windows:**
```powershell
./deploy.ps1 start
```

**Linux/macOS:**
```bash
./deploy.sh start
```

**Windows (Command Prompt):**
```cmd
deploy.bat start
```

That's it! The script handles everything automatically:
- ✅ Checks prerequisites (Docker, Node.js, pnpm)
- ✅ Sets up environment configuration
- ✅ Starts infrastructure (PostgreSQL + Redis)
- ✅ Runs database migrations and seeding
- ✅ Launches the application

### 📋 Prerequisites

**Required:**
- Docker & Docker Compose
- Node.js 18+
- pnpm
- OpenAI API key

**Auto-install available:** Run `./deploy.ps1 install` or `./deploy.sh install`

### 🎪 Demo Users (Pre-configured)

The application includes test users for all roles:

- **👤 John Doe** (Personal User): `john.doe@example.com`
- **👤 Sarah Wilson** (Enterprise User): `sarah.wilson@acmecorp.com`
- **👤 Michael Chen** (Enterprise Admin): `admin@acmecorp.com`

### 🔧 Manual Setup (Advanced)

If you prefer manual setup:

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd AICompanion
pnpm install

# 2. Copy environment template
cp .env.example .env.local
# Edit .env.local with your OpenAI API key

# 3. Start infrastructure
docker-compose -f infra/docker-compose.yml up -d

# 4. Setup database
pnpm db:migrate
pnpm db:seed

# 5. Start application
pnpm dev
```

Visit http://localhost:3000 to see the application.

### 🔍 Health Monitoring

Check system status anytime:
```bash
./health-check.ps1    # PowerShell
./health-check.sh     # Bash
```

📖 **See [QUICK_START.md](./QUICK_START.md) for detailed deployment guide**

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
