#!/bin/bash
set -e

# AI Companion Local Deployment Script
# Cross-platform deployment script for Linux/macOS

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Icons
INFO="ℹ️ "
SUCCESS="✅"
WARNING="⚠️ "
ERROR="❌"
STEP="🚀"

# Configuration
APP_NAME="ai-companion"
WEB_PORT=3000
DB_PORT=5432
REDIS_PORT=6379
HEALTH_TIMEOUT=120

# Functions
log_info() { echo -e "${CYAN}${INFO}$1${NC}"; }
log_success() { echo -e "${GREEN}${SUCCESS} $1${NC}"; }
log_warning() { echo -e "${YELLOW}${WARNING}$1${NC}"; }
log_error() { echo -e "${RED}${ERROR} $1${NC}"; }
log_step() { echo -e "${BLUE}${STEP} $1${NC}"; }

show_help() {
    cat << EOF
AI Companion Local Deployment Tool

USAGE:
    ./deploy.sh [ACTION] [OPTIONS]

ACTIONS:
    start       Start all services (default)
    stop        Stop all services
    restart     Restart all services
    status      Show service status
    cleanup     Remove all data and containers
    logs        Show service logs
    install     Install prerequisites

OPTIONS:
    --skip-deps     Skip dependency checks
    --detached      Run in background mode
    --force         Force actions without confirmation
    --help          Show this help message

EXAMPLES:
    ./deploy.sh start
    ./deploy.sh start --detached
    ./deploy.sh stop
    ./deploy.sh status
    ./deploy.sh cleanup --force

REQUIREMENTS:
    - Docker & Docker Compose
    - Node.js 18+
    - pnpm
    - OpenAI API key

EOF
}

check_prerequisites() {
    log_step "Checking prerequisites..."
    
    local missing=()
    
    # Check Docker
    if command -v docker >/dev/null 2>&1; then
        local docker_version=$(docker --version)
        log_info "Docker: $docker_version"
    else
        missing+=("Docker")
    fi
    
    # Check Docker Compose
    if docker compose version >/dev/null 2>&1; then
        local compose_version=$(docker compose version)
        log_info "Docker Compose: $compose_version"
    else
        missing+=("Docker Compose")
    fi
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        local major_version=$(echo $node_version | sed 's/v\([0-9]*\).*/\1/')
        if [ "$major_version" -ge 18 ]; then
            log_info "Node.js: $node_version ✓"
        else
            log_warning "Node.js 18+ required (current: $node_version)"
            missing+=("Node.js 18+")
        fi
    else
        missing+=("Node.js")
    fi
    
    # Check pnpm
    if command -v pnpm >/dev/null 2>&1; then
        local pnpm_version=$(pnpm --version)
        log_info "pnpm: v$pnpm_version ✓"
    else
        missing+=("pnpm")
    fi
    
    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing prerequisites: ${missing[*]}"
        log_info "Please install missing dependencies:"
        log_info "  - Docker: https://docs.docker.com/get-docker/"
        log_info "  - Node.js 18+: https://nodejs.org/"
        log_info "  - pnpm: npm install -g pnpm"
        exit 1
    fi
    
    log_success "All prerequisites satisfied"
}

initialize_environment() {
    log_step "Setting up environment..."
    
    # Copy environment template if not exists
    if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
        cp ".env.example" ".env.local"
        log_success "Created .env.local from template"
        log_warning "Please edit .env.local with your configuration"
        log_info "Minimum required: OPENAI_API_KEY"
    elif [ ! -f ".env.local" ]; then
        log_warning "No .env.local or .env.example found"
        log_info "Creating basic .env.local with defaults..."
        
        cat > .env.local << EOF
# AI Companion Local Development Environment
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_companion
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=local-dev-secret-change-in-production
WEB_BASE_URL=http://localhost:3000
WORKER_BASE_URL=http://localhost:3001
QUEUE_REDIS_URL=redis://localhost:6379
EMBEDDING_MODEL=text-embedding-3-large
LLM_MODEL=gpt-4-turbo
RERANKER_PROVIDER=openai
ENCRYPTION_KEY=local-dev-key-32-chars-long!!!

# Required: Add your OpenAI API key
OPENAI_API_KEY=your-openai-api-key-here

# Optional: Add these for full functionality
# GDRIVE_CLIENT_ID=your-google-client-id
# GDRIVE_CLIENT_SECRET=your-google-client-secret
# GITHUB_APP_ID=your-github-app-id
# GITHUB_PRIVATE_KEY=your-github-private-key-base64
EOF
        log_success "Created basic .env.local"
        log_warning "Remember to add your OPENAI_API_KEY in .env.local"
    fi
    
    # Install dependencies
    if [ ! -d "node_modules" ] || [ "$FORCE" = true ]; then
        log_step "Installing dependencies..."
        pnpm install
        log_success "Dependencies installed"
    else
        log_info "Dependencies already installed (use --force to reinstall)"
    fi
}

start_infrastructure() {
    log_step "Starting infrastructure services..."
    
    # Check if services are already running
    local running_services=$(docker ps --format "{{.Names}}" | grep -E "(postgres|redis)" || true)
    if [ -n "$running_services" ]; then
        log_info "Some services already running: $running_services"
    fi
    
    # Start infrastructure
    cd infra
    docker compose up -d
    cd ..
    
    log_success "Infrastructure services started"
}

wait_for_services() {
    log_step "Waiting for services to be ready..."
    
    local start_time=$(date +%s)
    local max_wait=$HEALTH_TIMEOUT
    
    # Wait for PostgreSQL
    log_info "Waiting for PostgreSQL..."
    while true; do
        if docker exec infra-postgres-1 pg_isready -U postgres >/dev/null 2>&1; then
            log_success "PostgreSQL is ready"
            break
        fi
        
        local current_time=$(date +%s)
        if [ $((current_time - start_time)) -gt $max_wait ]; then
            log_error "Timeout waiting for PostgreSQL"
            exit 1
        fi
        
        sleep 2
        echo -n "."
    done
    
    # Wait for Redis
    log_info "Waiting for Redis..."
    while true; do
        if docker exec infra-redis-1 redis-cli ping >/dev/null 2>&1; then
            log_success "Redis is ready"
            break
        fi
        
        local current_time=$(date +%s)
        if [ $((current_time - start_time)) -gt $max_wait ]; then
            log_error "Timeout waiting for Redis"
            exit 1
        fi
        
        sleep 2
        echo -n "."
    done
    
    log_success "All services are ready"
}

initialize_database() {
    log_step "Initializing database..."
    
    # Run migrations
    log_info "Running database migrations..."
    if pnpm db:migrate; then
        log_success "Database migrations completed"
    else
        log_warning "Database migration failed (this might be normal on first run)"
    fi
    
    # Seed database
    log_info "Seeding database with demo data..."
    if pnpm db:seed; then
        log_success "Database seeded with demo data"
    else
        log_warning "Database seeding failed (this might be normal if already seeded)"
    fi
}

start_application() {
    log_step "Starting application..."
    
    if [ "$DETACHED" = true ]; then
        log_info "Starting in background mode..."
        nohup pnpm dev > app.log 2> app.err.log &
        local pid=$!
        echo $pid > app.pid
        sleep 5
        
        # Check if process is still running
        if kill -0 $pid 2>/dev/null; then
            log_success "Application started in background (PID: $pid)"
            log_info "Logs: app.log and app.err.log"
        else
            log_error "Failed to start application in background"
            exit 1
        fi
    else
        log_info "Starting application in foreground..."
        log_info "Press Ctrl+C to stop"
        pnpm dev
    fi
}

test_application_health() {
    log_step "Checking application health..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "http://localhost:$WEB_PORT" >/dev/null 2>&1; then
            log_success "Application is healthy and responding"
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 2
        echo -n "."
    done
    
    log_warning "Application health check timed out"
    return 1
}

show_status() {
    log_step "System Status"
    
    # Infrastructure status
    log_info "Infrastructure Services:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(postgres|redis|Names)"
    
    # Application status
    echo ""
    log_info "Application Services:"
    if [ -f "app.pid" ]; then
        local pid=$(cat app.pid)
        if kill -0 $pid 2>/dev/null; then
            echo -e "${GREEN}Node.js (PID: $pid) - Running${NC}"
        else
            echo -e "${RED}Node.js - Not Running${NC}"
            rm -f app.pid
        fi
    else
        local node_pids=$(pgrep -f "next dev" || true)
        if [ -n "$node_pids" ]; then
            echo -e "${GREEN}Node.js (PID: $node_pids) - Running${NC}"
        else
            echo -e "${RED}Node.js - Not Running${NC}"
        fi
    fi
    
    # Port status
    echo ""
    log_info "Port Status:"
    local ports=($WEB_PORT $DB_PORT $REDIS_PORT)
    local services=("Web App" "PostgreSQL" "Redis")
    
    for i in "${!ports[@]}"; do
        local port=${ports[$i]}
        local service=${services[$i]}
        
        if nc -z localhost $port 2>/dev/null; then
            echo -e "${GREEN}$service (port $port) - Listening${NC}"
        else
            echo -e "${RED}$service (port $port) - Not Available${NC}"
        fi
    done
    
    # URLs
    echo ""
    log_info "Access URLs:"
    echo -e "${CYAN}🌐 Web Application: http://localhost:$WEB_PORT${NC}"
    echo -e "${CYAN}🐘 PostgreSQL: localhost:$DB_PORT${NC}"
    echo -e "${CYAN}📡 Redis: localhost:$REDIS_PORT${NC}"
}

stop_services() {
    log_step "Stopping services..."
    
    # Stop Node.js processes
    if [ -f "app.pid" ]; then
        local pid=$(cat app.pid)
        if kill -0 $pid 2>/dev/null; then
            log_info "Stopping Node.js application..."
            kill $pid
            rm -f app.pid
            log_success "Node.js application stopped"
        fi
    else
        local node_pids=$(pgrep -f "next dev" || true)
        if [ -n "$node_pids" ]; then
            log_info "Stopping Node.js application..."
            kill $node_pids
            log_success "Node.js application stopped"
        fi
    fi
    
    # Stop infrastructure
    log_info "Stopping infrastructure services..."
    cd infra
    docker compose down
    cd ..
    log_success "Infrastructure services stopped"
}

cleanup_all_data() {
    log_step "Cleaning up all data..."
    
    if [ "$FORCE" != true ]; then
        echo -n "This will remove all data including databases. Are you sure? (y/N): "
        read -r confirmation
        if [ "$confirmation" != "y" ] && [ "$confirmation" != "Y" ]; then
            log_info "Cleanup cancelled"
            return
        fi
    fi
    
    # Stop services first
    stop_services
    
    # Remove volumes
    log_info "Removing Docker volumes..."
    cd infra
    docker compose down -v
    docker volume prune -f
    cd ..
    log_success "Docker volumes removed"
    
    # Clean application files
    if [ -d "node_modules" ]; then
        log_info "Removing node_modules..."
        rm -rf node_modules
        log_success "node_modules removed"
    fi
    
    if [ -d ".next" ]; then
        log_info "Removing .next build cache..."
        rm -rf .next
        log_success ".next cache removed"
    fi
    
    rm -f app.log app.err.log app.pid
    
    log_success "Cleanup completed"
}

show_logs() {
    log_step "Showing logs..."
    
    log_info "Infrastructure logs (last 50 lines):"
    cd infra
    docker compose logs --tail=50
    cd ..
    
    if [ -f "app.log" ]; then
        echo ""
        log_info "Application logs (last 50 lines):"
        tail -50 app.log
    fi
    
    if [ -f "app.err.log" ]; then
        echo ""
        log_info "Application error logs (last 50 lines):"
        tail -50 app.err.log
    fi
}

install_prerequisites() {
    log_step "Installing prerequisites..."
    
    case "$(uname -s)" in
        Darwin*)
            # macOS
            if command -v brew >/dev/null 2>&1; then
                log_info "Installing with Homebrew..."
                brew install --cask docker
                brew install node
                npm install -g pnpm
            else
                log_warning "Homebrew not found. Installing Homebrew first..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
                eval "$(/opt/homebrew/bin/brew shellenv)"
                brew install --cask docker
                brew install node
                npm install -g pnpm
            fi
            ;;
        Linux*)
            # Linux
            if command -v apt-get >/dev/null 2>&1; then
                # Ubuntu/Debian
                log_info "Installing on Ubuntu/Debian..."
                sudo apt-get update
                sudo apt-get install -y docker.io docker-compose nodejs npm
                sudo npm install -g pnpm
                sudo usermod -aG docker $USER
                log_warning "Please log out and back in for Docker permissions to take effect"
            elif command -v yum >/dev/null 2>&1; then
                # RHEL/CentOS
                log_info "Installing on RHEL/CentOS..."
                sudo yum install -y docker docker-compose nodejs npm
                sudo npm install -g pnpm
                sudo systemctl start docker
                sudo systemctl enable docker
                sudo usermod -aG docker $USER
                log_warning "Please log out and back in for Docker permissions to take effect"
            else
                log_warning "Unsupported Linux distribution. Please install manually:"
                log_info "  - Docker: https://docs.docker.com/engine/install/"
                log_info "  - Node.js: https://nodejs.org/"
                log_info "  - pnpm: npm install -g pnpm"
            fi
            ;;
        *)
            log_warning "Unsupported operating system. Please install manually:"
            log_info "  - Docker: https://docs.docker.com/get-docker/"
            log_info "  - Node.js: https://nodejs.org/"
            log_info "  - pnpm: npm install -g pnpm"
            ;;
    esac
}

# Parse arguments
ACTION="start"
SKIP_DEPS=false
DETACHED=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        start|stop|restart|status|cleanup|logs|install)
            ACTION="$1"
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --detached)
            DETACHED=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
echo -e "${BLUE}🤖 AI Companion Local Deployment Tool${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

case $ACTION in
    install)
        install_prerequisites
        ;;
    start)
        if [ "$SKIP_DEPS" != true ]; then
            check_prerequisites
        fi
        initialize_environment
        start_infrastructure
        wait_for_services
        initialize_database
        
        log_success "Setup completed successfully!"
        log_info "Starting application..."
        echo ""
        
        if [ "$DETACHED" = true ]; then
            start_application
            sleep 10
            if test_application_health; then
                show_status
                echo ""
                log_success "🎉 AI Companion is running!"
                log_info "Access the application at: http://localhost:$WEB_PORT"
                log_info "Use './deploy.sh status' to check system status"
                log_info "Use './deploy.sh logs' to view logs"
                log_info "Use './deploy.sh stop' to stop all services"
            fi
        else
            echo -e "${GREEN}🎉 Setup complete! Application starting...${NC}"
            echo -e "${CYAN}Access the application at: http://localhost:$WEB_PORT${NC}"
            echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
            echo ""
            start_application
        fi
        ;;
    stop)
        stop_services
        log_success "All services stopped"
        ;;
    restart)
        stop_services
        sleep 3
        start_infrastructure
        wait_for_services
        start_application
        ;;
    status)
        show_status
        ;;
    cleanup)
        cleanup_all_data
        ;;
    logs)
        show_logs
        ;;
    *)
        log_error "Unknown action: $ACTION"
        show_help
        exit 1
        ;;
esac