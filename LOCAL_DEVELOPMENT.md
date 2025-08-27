# Local Development Configuration

## Deployment Scripts Overview

This repository includes comprehensive cross-platform deployment scripts for local testing and development.

### 📁 Script Files

| File | Platform | Purpose |
|------|----------|---------|
| `deploy.ps1` | Windows/Linux/macOS | PowerShell deployment script |
| `deploy.sh` | Linux/macOS | Bash deployment script |
| `deploy.bat` | Windows | Batch wrapper for PowerShell |
| `health-check.ps1` | Windows/Linux/macOS | PowerShell health monitoring |
| `health-check.sh` | Linux/macOS | Bash health monitoring |

### 🚀 Quick Commands

```bash
# Start everything
./deploy.sh start          # Linux/macOS
./deploy.ps1 start         # PowerShell
deploy.bat start           # Windows CMD

# Check system health  
./health-check.sh          # Linux/macOS
./health-check.ps1         # PowerShell

# View status
./deploy.sh status         # Linux/macOS
./deploy.ps1 status        # PowerShell

# Stop all services
./deploy.sh stop           # Linux/macOS
./deploy.ps1 stop          # PowerShell
```

## 🔧 What Gets Deployed

### Infrastructure Services
- **PostgreSQL 15** with pgvector extension (port 5432)
- **Redis 7** for caching and job queues (port 6379)

### Application Services  
- **Next.js Web App** with AI features (port 3000)
- **Database migrations** and demo data seeding
- **Environment configuration** with sensible defaults

### Test Users (Pre-configured)
- **John Doe** (Personal User): Individual AI assistant features
- **Sarah Wilson** (Enterprise User): Team features with controlled permissions
- **Michael Chen** (Enterprise Admin): Full organizational management

## 📋 Prerequisites

### Required
- **Docker** & Docker Compose
- **Node.js 18+**
- **pnpm** package manager
- **OpenAI API key**

### Auto-Install Available
Scripts can auto-install prerequisites on supported platforms:

```bash
./deploy.sh install        # Linux/macOS with package managers
./deploy.ps1 install       # Windows with Chocolatey/winget
```

## 🔍 Health Monitoring

### Basic Health Check
```bash
./health-check.sh          # Quick validation of all services
```

### Deep Health Check
```bash
./health-check.sh --deep   # Includes API endpoint testing
```

### Auto-Fix Issues
```bash
./health-check.sh --fix    # Attempts to fix common problems
```

## 🌐 Access Points

After successful deployment:

- **🏠 Main Application**: http://localhost:3000
- **🐘 PostgreSQL**: localhost:5432 (postgres/postgres)
- **📡 Redis**: localhost:6379

## 🔧 Configuration

### Environment Variables
Scripts automatically create `.env.local` with defaults:

```env
# Required: Add your OpenAI API key
OPENAI_API_KEY=your-openai-api-key-here

# Auto-configured for local development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_companion
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=local-dev-secret-change-in-production
```

### Optional Integrations
```env
# Google Drive integration
GDRIVE_CLIENT_ID=your-google-client-id
GDRIVE_CLIENT_SECRET=your-google-client-secret

# GitHub integration
GITHUB_APP_ID=your-github-app-id
GITHUB_PRIVATE_KEY=your-github-private-key-base64
```

## 🛠️ Development Workflow

### Daily Development
```bash
# Start for the day
./deploy.sh start --detached

# Check status anytime
./deploy.sh status

# View logs when debugging
./deploy.sh logs

# Stop when done
./deploy.sh stop
```

### Testing Changes
```bash
# Quick restart after code changes
./deploy.sh restart

# Full reset for clean testing
./deploy.sh cleanup --force
./deploy.sh start
```

## 🚨 Troubleshooting

### Common Issues

**Services won't start:**
```bash
./health-check.sh --fix    # Auto-fix common issues
```

**Port conflicts:**
```bash
# Check what's using the ports
netstat -tulpn | grep :3000    # Linux
netstat -an | findstr :3000    # Windows
```

**Database issues:**
```bash
# Reset everything
./deploy.sh cleanup --force
./deploy.sh start
```

### Advanced Debugging

**View detailed logs:**
```bash
./deploy.sh logs                   # All service logs
docker logs infra-postgres-1       # Database only
docker logs infra-redis-1          # Redis only
```

**Container status:**
```bash
docker ps                          # Running containers
docker compose -f infra/docker-compose.yml ps  # Infrastructure status
```

## 🎛️ Advanced Options

### Background Mode
```bash
./deploy.sh start --detached       # Run in background
./deploy.ps1 start -Detached       # PowerShell equivalent
```

### Skip Checks
```bash
./deploy.sh start --skip-deps      # Skip prerequisite validation
./deploy.ps1 start -SkipDeps       # PowerShell equivalent
```

### Force Operations
```bash
./deploy.sh start --force          # Force reinstall dependencies
./deploy.sh cleanup --force        # No confirmation prompts
```

## 💡 Development Tips

1. **Use detached mode** for background development
2. **Run health checks regularly** to catch issues early  
3. **Check logs first** when troubleshooting
4. **Keep `.env.local` secure** - never commit API keys
5. **Use cleanup sparingly** - removes all data including test users
6. **Test with different user roles** using the pre-configured accounts

## 🔒 Security Notes

- Scripts create development-only configurations
- Default passwords are for local development only
- API keys and secrets should be changed for production
- Database runs with default credentials (postgres/postgres)
- All services bind to localhost only

## 📖 Additional Resources

- **[QUICK_START.md](./QUICK_START.md)**: Detailed deployment guide
- **[DEPLOY.md](./DEPLOY.md)**: Production deployment options
- **[COMPREHENSIVE_REPORT.md](./COMPREHENSIVE_REPORT.md)**: Platform capabilities
- **[OPEN_ITEMS.md](./OPEN_ITEMS.md)**: Development roadmap

---

These scripts provide a zero-friction local development experience, handling all the complexity so you can focus on building amazing AI features! 🚀