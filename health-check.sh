#!/bin/bash
# AI Companion Health Check and Diagnostics Tool (Bash version)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Icons
INFO="ℹ️ "
SUCCESS="✅"
WARNING="⚠️ "
ERROR="❌"
STEP="🚀"

# Configuration
WEB_PORT=3000
DB_PORT=5432
REDIS_PORT=6379

# Functions
log_info() { echo -e "${CYAN}${INFO}$1${NC}"; }
log_success() { echo -e "${GREEN}${SUCCESS} $1${NC}"; }
log_warning() { echo -e "${YELLOW}${WARNING}$1${NC}"; }
log_error() { echo -e "${RED}${ERROR} $1${NC}"; }
log_step() { echo -e "${BLUE}${STEP} $1${NC}"; }

show_help() {
    cat << EOF
AI Companion Health Check and Diagnostics Tool

USAGE:
    ./health-check.sh [OPTIONS]

OPTIONS:
    --deep      Perform deep health checks including API validation
    --fix       Automatically attempt to fix common issues
    --help      Show this help message

EXAMPLES:
    ./health-check.sh
    ./health-check.sh --deep
    ./health-check.sh --fix

DESCRIPTION:
    Comprehensive health check script that validates all system components,
    diagnoses issues, and provides recommendations for fixes.

EOF
}

test_port() {
    local port=$1
    local host=${2:-localhost}
    
    if command -v nc >/dev/null 2>&1; then
        nc -z $host $port 2>/dev/null
    elif command -v telnet >/dev/null 2>&1; then
        echo "quit" | telnet $host $port >/dev/null 2>&1
    else
        # Fallback using /dev/tcp
        (echo >/dev/tcp/$host/$port) >/dev/null 2>&1
    fi
}

test_http_endpoint() {
    local url=$1
    local timeout=${2:-10}
    
    if command -v curl >/dev/null 2>&1; then
        if curl -s -f --connect-timeout $timeout "$url" >/dev/null 2>&1; then
            echo '{"Success": true}'
        else
            echo '{"Success": false, "Error": "HTTP request failed"}'
        fi
    elif command -v wget >/dev/null 2>&1; then
        if wget -q --timeout=$timeout --spider "$url" >/dev/null 2>&1; then
            echo '{"Success": true}'
        else
            echo '{"Success": false, "Error": "HTTP request failed"}'
        fi
    else
        echo '{"Success": false, "Error": "No HTTP client available (curl/wget)"}'
    fi
}

test_database_connection() {
    if [ ! -f ".env.local" ]; then
        echo '{"Success": false, "Error": "DATABASE_URL not found in .env.local"}'
        return
    fi
    
    # Test using docker exec if container is running
    local container_name="infra-postgres-1"
    if docker exec $container_name pg_isready -U postgres >/dev/null 2>&1; then
        echo '{"Success": true, "Message": "Database connection successful"}'
    else
        echo '{"Success": false, "Error": "Database not ready or container not running"}'
    fi
}

test_redis_connection() {
    local container_name="infra-redis-1"
    local result=$(docker exec $container_name redis-cli ping 2>/dev/null || echo "FAIL")
    
    if [ "$result" = "PONG" ]; then
        echo '{"Success": true, "Message": "Redis connection successful"}'
    else
        echo '{"Success": false, "Error": "Redis not ready or container not running"}'
    fi
}

test_openai_api_key() {
    if [ ! -f ".env.local" ]; then
        echo '{"Success": false, "Error": "OPENAI_API_KEY not found in .env.local"}'
        return
    fi
    
    local api_key=$(grep "OPENAI_API_KEY=" .env.local | cut -d'=' -f2)
    
    if [ -z "$api_key" ] || [ "$api_key" = "your-openai-api-key-here" ]; then
        echo '{"Success": false, "Error": "OpenAI API key not configured (still placeholder)"}'
        return
    fi
    
    if [ "$DEEP" = true ]; then
        log_info "Testing OpenAI API key..."
        if command -v curl >/dev/null 2>&1; then
            local response=$(curl -s -H "Authorization: Bearer $api_key" \
                                  -H "Content-Type: application/json" \
                                  "https://api.openai.com/v1/models" \
                                  --connect-timeout 10)
            
            if echo "$response" | grep -q '"data"'; then
                echo '{"Success": true, "Message": "OpenAI API key valid and working"}'
            else
                echo '{"Success": false, "Error": "OpenAI API returned unexpected response"}'
            fi
        else
            echo '{"Success": false, "Error": "curl not available for API testing"}'
        fi
    else
        echo '{"Success": true, "Message": "OpenAI API key configured (not tested)"}'
    fi
}

test_docker_services() {
    local services=$(docker ps --format "{{.Names}}" | grep -E "(postgres|redis)" || true)
    local expected="infra-postgres-1 infra-redis-1"
    local missing=""
    
    for service in $expected; do
        if ! echo "$services" | grep -q "$service"; then
            missing="$missing $service"
        fi
    done
    
    if [ -z "$missing" ]; then
        echo '{"Success": true, "Message": "All Docker services running"}'
    else
        echo "{\"Success\": false, \"Error\": \"Missing services:$missing\"}"
    fi
}

test_node_application() {
    local node_pids=$(pgrep -f "next dev" || true)
    
    if [ -n "$node_pids" ]; then
        echo "{\"Success\": true, \"Message\": \"Node.js application running (PID: $node_pids)\"}"
    else
        echo '{"Success": false, "Error": "Node.js application not running"}'
    fi
}

test_environment_file() {
    if [ ! -f ".env.local" ]; then
        echo '{"Success": false, "Error": ".env.local file not found"}'
        return
    fi
    
    local required_vars="DATABASE_URL REDIS_URL NEXTAUTH_SECRET OPENAI_API_KEY"
    local missing=""
    
    for var in $required_vars; do
        if ! grep -q "^$var=" .env.local; then
            missing="$missing $var"
        fi
    done
    
    if [ -z "$missing" ]; then
        echo '{"Success": true, "Message": "All required environment variables present"}'
    else
        echo "{\"Success\": false, \"Error\": \"Missing environment variables:$missing\"}"
    fi
}

test_dependencies() {
    if [ ! -d "node_modules" ]; then
        echo '{"Success": false, "Error": "node_modules not found - run pnpm install"}'
        return
    fi
    
    if [ ! -d "node_modules/.pnpm" ]; then
        echo '{"Success": false, "Error": "Dependencies not installed with pnpm"}'
        return
    fi
    
    echo '{"Success": true, "Message": "Dependencies installed correctly"}'
}

fix_common_issues() {
    log_step "Attempting to fix common issues..."
    
    local fixed=()
    
    # Fix missing .env.local
    if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
        cp ".env.example" ".env.local"
        fixed+=("Created .env.local from .env.example")
    fi
    
    # Fix missing dependencies
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        if pnpm install; then
            fixed+=("Installed dependencies")
        fi
    fi
    
    # Fix stopped services
    local docker_test=$(test_docker_services)
    if ! echo "$docker_test" | grep -q '"Success": true'; then
        log_info "Starting Docker services..."
        cd infra
        if docker compose up -d; then
            fixed+=("Started Docker services")
        fi
        cd ..
    fi
    
    if [ ${#fixed[@]} -gt 0 ]; then
        log_success "Fixed issues:"
        for fix in "${fixed[@]}"; do
            log_info "  - $fix"
        done
    else
        log_info "No automatic fixes available"
    fi
}

show_recommendations() {
    local results="$1"
    
    log_step "Recommendations:"
    
    local has_issues=false
    
    # Parse results and show recommendations
    if echo "$results" | grep -q "Environment File.*false"; then
        has_issues=true
        log_info "  - Run './deploy.sh start' to create environment file"
    fi
    
    if echo "$results" | grep -q "Dependencies.*false"; then
        has_issues=true
        log_info "  - Run 'pnpm install' to install dependencies"
    fi
    
    if echo "$results" | grep -q "Docker Services.*false"; then
        has_issues=true
        log_info "  - Run 'docker compose up -d' in infra/ directory"
        log_info "  - Or run './deploy.sh start' for full setup"
    fi
    
    if echo "$results" | grep -q "Database Connection.*false"; then
        has_issues=true
        log_info "  - Ensure PostgreSQL container is running"
        log_info "  - Check DATABASE_URL in .env.local"
    fi
    
    if echo "$results" | grep -q "Redis Connection.*false"; then
        has_issues=true
        log_info "  - Ensure Redis container is running"
        log_info "  - Check REDIS_URL in .env.local"
    fi
    
    if echo "$results" | grep -q "OpenAI API.*false"; then
        has_issues=true
        log_info "  - Add valid OpenAI API key to .env.local"
        log_info "  - Get API key from: https://platform.openai.com/api-keys"
    fi
    
    if echo "$results" | grep -q "Node Application.*false"; then
        has_issues=true
        log_info "  - Start application with 'pnpm dev'"
        log_info "  - Or run './deploy.sh start' for full setup"
    fi
    
    if echo "$results" | grep -q "Web Port.*false"; then
        has_issues=true
        log_info "  - Ensure application is running"
        log_info "  - Check if port $WEB_PORT is available"
    fi
    
    if [ "$has_issues" = false ]; then
        log_success "  All systems operational! 🎉"
        log_info "  Access your application at: http://localhost:$WEB_PORT"
    else
        log_info "  Run './deploy.sh start' for automatic setup"
        log_info "  Use '--fix' flag to attempt automatic fixes"
    fi
}

# Parse arguments
DEEP=false
FIX=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --deep)
            DEEP=true
            shift
            ;;
        --fix)
            FIX=true
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

# Main health check execution
echo -e "${BLUE}🔍 AI Companion Health Check${NC}"
echo -e "${BLUE}=============================${NC}"
echo ""

if [ "$FIX" = true ]; then
    fix_common_issues
    echo ""
fi

# Run health checks
log_step "Running health checks..."
echo ""

all_healthy=true
results=""

# Define health checks
health_checks=(
    "Environment File:test_environment_file"
    "Dependencies:test_dependencies"
    "Docker Services:test_docker_services"
    "Database Connection:test_database_connection"
    "Redis Connection:test_redis_connection"
    "OpenAI API:test_openai_api_key"
    "Node Application:test_node_application"
    "Web Port:test_port $WEB_PORT"
)

for check in "${health_checks[@]}"; do
    local name=$(echo "$check" | cut -d':' -f1)
    local test_func=$(echo "$check" | cut -d':' -f2)
    
    echo -n "Testing $name... "
    
    if [ "$name" = "Web Port" ]; then
        if test_port $WEB_PORT; then
            result='{"Success": true, "Message": "Web port '$WEB_PORT' available"}'
        else
            result='{"Success": false, "Error": "Web port '$WEB_PORT' not available"}'
        fi
    else
        result=$($test_func)
    fi
    
    results="$results\n$name: $result"
    
    if echo "$result" | grep -q '"Success": true'; then
        echo -e "${GREEN}✅${NC}"
        local message=$(echo "$result" | grep -o '"Message": "[^"]*"' | cut -d'"' -f4)
        if [ -n "$message" ]; then
            echo -e "${GRAY}    $message${NC}"
        fi
    else
        echo -e "${RED}❌${NC}"
        local error=$(echo "$result" | grep -o '"Error": "[^"]*"' | cut -d'"' -f4)
        echo -e "${RED}    $error${NC}"
        all_healthy=false
    fi
done

echo ""

# Deep checks if requested
if [ "$DEEP" = true ] && [ "$all_healthy" = true ]; then
    log_step "Running deep health checks..."
    
    # Test API endpoints
    endpoints=(
        "Health Endpoint:http://localhost:$WEB_PORT/api/health"
        "Main Page:http://localhost:$WEB_PORT"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local name=$(echo "$endpoint" | cut -d':' -f1)
        local url=$(echo "$endpoint" | cut -d':' -f2-3)
        
        echo -n "Testing $name... "
        local result=$(test_http_endpoint "$url")
        
        if echo "$result" | grep -q '"Success": true'; then
            echo -e "${GREEN}✅${NC}"
        else
            echo -e "${RED}❌${NC}"
            local error=$(echo "$result" | grep -o '"Error": "[^"]*"' | cut -d'"' -f4)
            echo -e "${RED}    $error${NC}"
            all_healthy=false
        fi
    done
    echo ""
fi

# Summary
if [ "$all_healthy" = true ]; then
    log_success "🎉 All health checks passed!"
    log_info "Your AI Companion is ready to use at: http://localhost:$WEB_PORT"
else
    log_warning "⚠️  Some health checks failed"
    show_recommendations "$results"
fi

# System information
echo ""
log_step "System Information:"
log_info "OS: $(uname -s)"
log_info "Bash: $BASH_VERSION"
if command -v docker >/dev/null 2>&1; then
    log_info "Docker: $(docker --version)"
fi
if command -v node >/dev/null 2>&1; then
    log_info "Node.js: $(node --version)"
fi
if command -v pnpm >/dev/null 2>&1; then
    log_info "pnpm: v$(pnpm --version)"
fi

exit $(if [ "$all_healthy" = true ]; then echo 0; else echo 1; fi)