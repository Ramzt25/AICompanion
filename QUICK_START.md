# 🚀 Quick Start Guide - Local Deployment

Get your AI Companion running locally in minutes with our automated deployment scripts!

## 🎯 One-Command Setup

### Windows (PowerShell)
```powershell
# Download and run
./deploy.ps1 start

# Or with auto-install prerequisites
./deploy.ps1 install
./deploy.ps1 start
```

### Linux/macOS (Bash)
```bash
# Download and run
./deploy.sh start

# Or with auto-install prerequisites
./deploy.sh install
./deploy.sh start
```

### Windows (Command Prompt)
```cmd
deploy.bat start
```

## 📋 Prerequisites

**Required:**
- Docker & Docker Compose
- Node.js 18+
- pnpm
- OpenAI API key

**Auto-Install Available:**
- Windows: Chocolatey or winget
- macOS: Homebrew
- Linux: apt/yum package managers

## ⚡ Quick Commands

| Action | PowerShell | Bash | Description |
|--------|------------|------|-------------|
| **Start** | `./deploy.ps1 start` | `./deploy.sh start` | Full setup and start |
| **Stop** | `./deploy.ps1 stop` | `./deploy.sh stop` | Stop all services |
| **Status** | `./deploy.ps1 status` | `./deploy.sh status` | Check system status |
| **Logs** | `./deploy.ps1 logs` | `./deploy.sh logs` | View service logs |
| **Health** | `./health-check.ps1` | `./health-check.sh` | Full health check |
| **Cleanup** | `./deploy.ps1 cleanup` | `./deploy.sh cleanup` | Remove all data |

## 🔧 What the Scripts Do

1. **Environment Setup**
   - ✅ Check prerequisites (Docker, Node.js, pnpm)
   - ✅ Create `.env.local` from template
   - ✅ Install dependencies with pnpm

2. **Infrastructure**
   - ✅ Start PostgreSQL with pgvector extension
   - ✅ Start Redis for caching and queues
   - ✅ Wait for services to be ready

3. **Database**
   - ✅ Run database migrations
   - ✅ Seed with demo data and test users

4. **Application**
   - ✅ Start Next.js development server
   - ✅ Health checks and validation
   - ✅ Display access URLs

## 🎪 Demo Users (Pre-configured)

Access the application and try different roles:

**Personal User:**
- 👤 John Doe (`john.doe@example.com`)
- Features: Basic AI chat, knowledge graph, personal settings

**Enterprise User:**
- 👤 Sarah Wilson (`sarah.wilson@acmecorp.com`) 
- Features: Team analytics, enterprise skills, controlled permissions

**Enterprise Admin:**
- 👤 Michael Chen (`admin@acmecorp.com`)
- Features: Full organization management, user control, AI training

## 🌐 Access URLs

After startup, access your application:

- **🏠 Main Application**: http://localhost:3000
- **🐘 Database**: localhost:5432 (postgres/postgres)
- **📡 Redis**: localhost:6379

## 🔍 Health Monitoring

### Quick Health Check
```powershell
# PowerShell
./health-check.ps1

# Bash
./health-check.sh
```

### Deep Health Check (includes API tests)
```powershell
./health-check.ps1 -Deep
```

### Auto-Fix Common Issues
```powershell
./health-check.ps1 -Fix
```

## 🛠️ Configuration

### Required Environment Variables
Edit `.env.local` (created automatically):

```env
# ⚠️ REQUIRED: Add your OpenAI API key
OPENAI_API_KEY=your-openai-api-key-here

# ✅ Already configured for local development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_companion
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
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

## 🚨 Troubleshooting

### Common Issues

**Docker not found:**
```bash
# Auto-install
./deploy.sh install     # Linux/macOS
./deploy.ps1 install    # Windows
```

**Port conflicts:**
```bash
# Check what's using the ports
netstat -tulpn | grep :3000    # Linux
netstat -an | findstr :3000    # Windows
```

**Database connection issues:**
```bash
# Reset infrastructure
./deploy.sh stop
./deploy.sh cleanup --force
./deploy.sh start
```

**OpenAI API errors:**
- Verify API key in `.env.local`
- Check account quota at https://platform.openai.com/usage
- Ensure billing is set up

### Advanced Debugging

**View detailed logs:**
```bash
./deploy.sh logs           # All service logs
docker logs infra-postgres-1  # Database logs
docker logs infra-redis-1     # Redis logs
```

**Reset everything:**
```bash
./deploy.sh cleanup --force   # ⚠️ Removes ALL data
./deploy.sh start
```

## 🔄 Development Workflow

### Daily Development
```bash
# Start for the day
./deploy.sh start --detached

# Check status
./deploy.sh status

# View logs when needed
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

## 🎛️ Advanced Options

### Background Mode
```bash
# Start in background (detached)
./deploy.sh start --detached
./deploy.ps1 start -Detached

# Check status later
./deploy.sh status
```

### Skip Dependency Checks
```bash
# For faster startup if you know dependencies are OK
./deploy.sh start --skip-deps
./deploy.ps1 start -SkipDeps
```

### Force Operations
```bash
# Force reinstall dependencies
./deploy.sh start --force
./deploy.ps1 start -Force

# Force cleanup without confirmation
./deploy.sh cleanup --force
./deploy.ps1 cleanup -Force
```

## 📱 Platform Support

| Platform | Script | Requirements |
|----------|--------|--------------|
| **Windows** | `deploy.ps1` or `deploy.bat` | PowerShell 7+ recommended |
| **macOS** | `deploy.sh` | Bash, Homebrew for auto-install |
| **Linux** | `deploy.sh` | Bash, Docker, package manager |
| **WSL** | `deploy.sh` | Windows Subsystem for Linux |

## 🎉 What's Next?

Once running:

1. **🔐 Configure Authentication**: Add OAuth providers in settings
2. **📄 Upload Documents**: Start with the Knowledge tab
3. **🤖 Train AI**: Use the Training tab for custom models
4. **👥 Add Users**: Enterprise admins can manage team members
5. **📊 Monitor Analytics**: View usage and insights
6. **🔧 Customize Skills**: Install from the Skills Marketplace

## 💡 Pro Tips

- **Use `--detached` mode** for background development
- **Run health checks regularly** to catch issues early
- **Check logs first** when troubleshooting issues
- **Keep `.env.local` secure** - never commit API keys
- **Use cleanup sparingly** - it removes all data including test users

---

🎯 **Goal: Zero-friction local development experience**

These scripts handle all the complexity so you can focus on building amazing AI experiences!