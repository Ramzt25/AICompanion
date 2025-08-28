# 🤖 AI Companion

An intelligent, embeddable AI assistant that provides contextual help and knowledge management capabilities. Built with Next.js, PostgreSQL, and OpenAI integration.

## 🚀 Current Status

**✅ Core System Complete** - Ready for OpenAI API integration and production deployment

### What's Working Now:
- ✅ **Embeddable Widget**: Floating AI assistant that can be embedded on any website
- ✅ **Authentication System**: JWT-based auth with session management  
- ✅ **Database**: PostgreSQL with vector embeddings (pgvector)
- ✅ **RAG Pipeline**: Document processing and contextual responses
- ✅ **Queue System**: Background processing with BullMQ + Redis
- ✅ **Infrastructure**: Docker-based development environment

### Demo:
```html
<!-- Embed the AI assistant on any website -->
<script src="http://localhost:3000/widget.js" 
        data-org-id="your-org-id" 
        data-user-id="your-user-id"></script>
```

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- pnpm

### 1. Clone and Install
```bash
git clone https://github.com/Ramzt25/AICompanion.git
cd AICompanion
pnpm install
```

### 2. Start Infrastructure
```bash
cd infra
docker-compose up -d
```

### 3. Set Environment Variables
```bash
cd apps/web
cp .env.example .env.local
# Edit .env.local with your OpenAI API key
```

### 4. Run Database Migrations
```bash
cd packages/db
pnpm run migrate
pnpm run seed
```

### 5. Start Development Server
```bash
cd apps/web
pnpm dev
```

### 6. Test the Widget
Open `embed-demo.html` in your browser to see the floating AI assistant in action.

## 🏗️ Architecture

```
┌─ apps/
│  ├─ web/           # Next.js application
│  └─ worker/        # Background job processor
├─ packages/
│  ├─ db/           # Database schemas & migrations  
│  └─ shared/       # Shared types and utilities
└─ infra/           # Docker infrastructure
```

### Key Components:
- **Widget System**: Embeddable floating chat widget (`/widget.js`)
- **RAG Pipeline**: Document processing with vector embeddings
- **Auth System**: JWT-based authentication with sessions
- **Queue System**: BullMQ for background processing
- **Multi-tenant**: Organization-based access control

## 📱 Features

### Embeddable AI Widget
- Floating chat interface that can be embedded anywhere
- Contextual assistance based on page content
- Auto-minimizes when not in use
- Cross-origin support for any website

### Intelligent Document Processing  
- Upload PDFs, DOCX, TXT, and Markdown files
- Automatic chunking and vector embedding generation
- Contextual search with citations
- Multi-document knowledge synthesis

### Enterprise Ready
- Multi-tenant organization support
- Role-based access control
- Analytics and usage insights
- SSO integration ready

## 🔧 API Endpoints

### Widget APIs
- `GET /widget.js` - Embeddable widget script
- `POST /api/widget/chat` - Chat with contextual AI
- `POST /api/widget/suggestions` - Get page-based suggestions

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - Session termination

### Document Management
- `POST /api/ingest` - Upload and process documents
- `GET /api/documents` - List user documents
- `DELETE /api/documents/:id` - Delete document

## 🚀 Next Steps

See [TODO.md](./TODO.md) for the complete roadmap. Immediate priorities:

1. **OpenAI Integration** - Replace mock responses with real AI
2. **Frontend Auth** - Connect login/register forms  
3. **Document Upload** - Build file processing UI
4. **Production Deploy** - Security hardening and deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🆘 Support

- 📝 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/Ramzt25/AICompanion/issues)  
- 💬 [Discussions](https://github.com/Ramzt25/AICompanion/discussions)

---

**Status**: Active Development | **Version**: 0.1.0-alpha | **Last Updated**: August 28, 2025
