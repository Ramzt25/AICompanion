#!/bin/bash
# AI Companion - Demo Deployment Script
# Shows the local deployment process with explanations

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🎬 AI Companion Local Deployment Demo${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

echo -e "${CYAN}This demo shows how to deploy AI Companion locally for testing.${NC}"
echo -e "${CYAN}The deployment scripts handle everything automatically!${NC}"
echo ""

echo -e "${GREEN}📋 What you'll need:${NC}"
echo "  ✅ Docker & Docker Compose"
echo "  ✅ Node.js 18+"
echo "  ✅ pnpm package manager"
echo "  ✅ OpenAI API key"
echo ""

echo -e "${GREEN}🚀 Available deployment options:${NC}"
echo ""

echo -e "${YELLOW}Option 1: Bash Script (Linux/macOS)${NC}"
echo "  ./deploy.sh start                 # Full setup and start"
echo "  ./deploy.sh start --detached      # Run in background"
echo "  ./deploy.sh status                # Check system status"
echo "  ./deploy.sh stop                  # Stop all services"
echo "  ./deploy.sh cleanup --force       # Reset everything"
echo ""

echo -e "${YELLOW}Option 2: PowerShell (Windows/Linux/macOS)${NC}"
echo "  ./deploy.ps1 start                # Full setup and start"
echo "  ./deploy.ps1 start -Detached      # Run in background"  
echo "  ./deploy.ps1 status               # Check system status"
echo "  ./deploy.ps1 stop                 # Stop all services"
echo "  ./deploy.ps1 cleanup -Force       # Reset everything"
echo ""

echo -e "${YELLOW}Option 3: Windows Batch${NC}"
echo "  deploy.bat start                  # Uses PowerShell internally"
echo ""

echo -e "${GREEN}🔍 Health monitoring:${NC}"
echo "  ./health-check.sh                 # Basic health check"
echo "  ./health-check.sh --deep          # Deep validation with API tests"
echo "  ./health-check.sh --fix           # Auto-fix common issues"
echo "  ./health-check.ps1                # PowerShell version"
echo ""

echo -e "${GREEN}🎯 What happens during deployment:${NC}"
echo ""
echo "  1️⃣  Check prerequisites (Docker, Node.js, pnpm)"
echo "  2️⃣  Create .env.local with sensible defaults"
echo "  3️⃣  Install dependencies with pnpm"
echo "  4️⃣  Start PostgreSQL + Redis containers"
echo "  5️⃣  Wait for services to be ready"
echo "  6️⃣  Run database migrations"
echo "  7️⃣  Seed demo data with test users"
echo "  8️⃣  Start Next.js application"
echo "  9️⃣  Health check and display access URLs"
echo ""

echo -e "${GREEN}🎪 Pre-configured test users:${NC}"
echo "  👤 John Doe (Personal): john.doe@example.com"
echo "  👤 Sarah Wilson (Enterprise): sarah.wilson@acmecorp.com"
echo "  👤 Michael Chen (Admin): admin@acmecorp.com"
echo ""

echo -e "${GREEN}🌐 Access URLs after deployment:${NC}"
echo "  🏠 Main Application: http://localhost:3000"
echo "  🐘 PostgreSQL: localhost:5432"
echo "  📡 Redis: localhost:6379"
echo ""

echo -e "${CYAN}💡 Pro Tips:${NC}"
echo "  • Use '--detached' for background development"
echo "  • Run health checks regularly to catch issues"
echo "  • Check logs first when troubleshooting"
echo "  • Keep .env.local secure - never commit API keys"
echo ""

echo -e "${YELLOW}🚀 Ready to start? Run one of these commands:${NC}"
echo ""
echo -e "${GREEN}  ./deploy.sh start${NC}        ${CYAN}# Linux/macOS users${NC}"
echo -e "${GREEN}  ./deploy.ps1 start${NC}       ${CYAN}# PowerShell users${NC}"
echo -e "${GREEN}  deploy.bat start${NC}         ${CYAN}# Windows CMD users${NC}"
echo ""

echo -e "${BLUE}📖 For detailed documentation, see:${NC}"
echo "  • QUICK_START.md - Step-by-step deployment guide"
echo "  • LOCAL_DEVELOPMENT.md - Development workflow"
echo "  • COMPREHENSIVE_REPORT.md - Platform capabilities"
echo ""

echo -e "${GREEN}Happy coding! 🤖✨${NC}"