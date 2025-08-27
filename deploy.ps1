#!/usr/bin/env pwsh
<#
.SYNOPSIS
Local deployment script for AI Companion - Cross-platform PowerShell version

.DESCRIPTION
This script sets up and deploys the AI Companion application locally for testing.
It handles environment setup, infrastructure startup, database initialization, and application launch.

.PARAMETER Action
The action to perform: start, stop, restart, status, cleanup, or logs

.PARAMETER SkipDeps
Skip dependency checks

.PARAMETER Detached
Run in detached mode (background)

.EXAMPLE
./deploy.ps1 start
./deploy.ps1 stop
./deploy.ps1 restart
./deploy.ps1 status
./deploy.ps1 cleanup
./deploy.ps1 logs

.NOTES
Requires: PowerShell 7+, Docker, Node.js 18+, pnpm
#>

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "status", "cleanup", "logs", "install")]
    [string]$Action = "start",
    
    [switch]$SkipDeps,
    [switch]$Detached,
    [switch]$Force,
    [switch]$Help
)

# Color output functions
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Step { param($Message) Write-Host "🚀 $Message" -ForegroundColor Blue }

# Configuration
$APP_NAME = "ai-companion"
$WEB_PORT = 3000
$DB_PORT = 5432
$REDIS_PORT = 6379
$HEALTH_TIMEOUT = 120

if ($Help) {
    Get-Help $MyInvocation.MyCommand.Path -Detailed
    exit 0
}

function Test-Prerequisites {
    Write-Step "Checking prerequisites..."
    
    $missing = @()
    
    # Check PowerShell version
    if ($PSVersionTable.PSVersion.Major -lt 7) {
        Write-Warning "PowerShell 7+ recommended (current: $($PSVersionTable.PSVersion))"
    }
    
    # Check Docker
    try {
        $dockerVersion = docker --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Docker: $dockerVersion"
        } else {
            $missing += "Docker"
        }
    } catch {
        $missing += "Docker"
    }
    
    # Check Docker Compose
    try {
        $composeVersion = docker compose version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Docker Compose: $composeVersion"
        } else {
            $missing += "Docker Compose"
        }
    } catch {
        $missing += "Docker Compose"
    }
    
    # Check Node.js
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            $version = [Version]($nodeVersion -replace 'v', '')
            if ($version.Major -ge 18) {
                Write-Info "Node.js: $nodeVersion ✓"
            } else {
                Write-Warning "Node.js 18+ required (current: $nodeVersion)"
                $missing += "Node.js 18+"
            }
        } else {
            $missing += "Node.js"
        }
    } catch {
        $missing += "Node.js"
    }
    
    # Check pnpm
    try {
        $pnpmVersion = pnpm --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Info "pnpm: v$pnpmVersion ✓"
        } else {
            $missing += "pnpm"
        }
    } catch {
        $missing += "pnpm"
    }
    
    if ($missing.Count -gt 0) {
        Write-Error "Missing prerequisites: $($missing -join ', ')"
        Write-Info "Please install missing dependencies:"
        Write-Info "  - Docker: https://docs.docker.com/get-docker/"
        Write-Info "  - Node.js 18+: https://nodejs.org/"
        Write-Info "  - pnpm: npm install -g pnpm"
        exit 1
    }
    
    Write-Success "All prerequisites satisfied"
}

function Initialize-Environment {
    Write-Step "Setting up environment..."
    
    # Copy environment template if not exists
    if (-not (Test-Path ".env.local") -and (Test-Path ".env.example")) {
        Copy-Item ".env.example" ".env.local"
        Write-Success "Created .env.local from template"
        Write-Warning "Please edit .env.local with your configuration"
        Write-Info "Minimum required: OPENAI_API_KEY"
    } elseif (-not (Test-Path ".env.local")) {
        Write-Warning "No .env.local or .env.example found"
        Write-Info "Creating basic .env.local with defaults..."
        
        $envContent = @"
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
"@
        Set-Content ".env.local" $envContent
        Write-Success "Created basic .env.local"
        Write-Warning "Remember to add your OPENAI_API_KEY in .env.local"
    }
    
    # Install dependencies
    if (-not (Test-Path "node_modules") -or $Force) {
        Write-Step "Installing dependencies..."
        pnpm install
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to install dependencies"
            exit 1
        }
        Write-Success "Dependencies installed"
    } else {
        Write-Info "Dependencies already installed (use -Force to reinstall)"
    }
}

function Start-Infrastructure {
    Write-Step "Starting infrastructure services..."
    
    # Check if services are already running
    $runningServices = docker ps --format "table {{.Names}}" | Select-String "postgres|redis"
    if ($runningServices) {
        Write-Info "Some services already running: $($runningServices -join ', ')"
    }
    
    # Start infrastructure
    Push-Location "infra"
    try {
        if ($Detached) {
            docker compose up -d
        } else {
            docker compose up -d
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to start infrastructure"
            exit 1
        }
    } finally {
        Pop-Location
    }
    
    Write-Success "Infrastructure services started"
}

function Wait-ForServices {
    Write-Step "Waiting for services to be ready..."
    
    $startTime = Get-Date
    $maxWait = [TimeSpan]::FromSeconds($HEALTH_TIMEOUT)
    
    # Wait for PostgreSQL
    Write-Info "Waiting for PostgreSQL..."
    do {
        try {
            $null = docker exec infra-postgres-1 pg_isready -U postgres 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "PostgreSQL is ready"
                break
            }
        } catch { }
        
        if ((Get-Date) - $startTime -gt $maxWait) {
            Write-Error "Timeout waiting for PostgreSQL"
            exit 1
        }
        
        Start-Sleep 2
        Write-Host "." -NoNewline
    } while ($true)
    
    # Wait for Redis
    Write-Info "Waiting for Redis..."
    do {
        try {
            $null = docker exec infra-redis-1 redis-cli ping 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Redis is ready"
                break
            }
        } catch { }
        
        if ((Get-Date) - $startTime -gt $maxWait) {
            Write-Error "Timeout waiting for Redis"
            exit 1
        }
        
        Start-Sleep 2
        Write-Host "." -NoNewline
    } while ($true)
    
    Write-Success "All services are ready"
}

function Initialize-Database {
    Write-Step "Initializing database..."
    
    # Run migrations
    Write-Info "Running database migrations..."
    pnpm db:migrate
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Database migration failed (this might be normal on first run)"
    } else {
        Write-Success "Database migrations completed"
    }
    
    # Seed database
    Write-Info "Seeding database with demo data..."
    pnpm db:seed
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Database seeding failed (this might be normal if already seeded)"
    } else {
        Write-Success "Database seeded with demo data"
    }
}

function Start-Application {
    Write-Step "Starting application..."
    
    if ($Detached) {
        Write-Info "Starting in background mode..."
        Start-Process -NoNewWindow -RedirectStandardOutput "app.log" -RedirectStandardError "app.err.log" pnpm "dev"
        Start-Sleep 5
        
        # Check if process is running
        $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next dev*" }
        if ($processes) {
            Write-Success "Application started in background (PID: $($processes[0].Id))"
            Write-Info "Logs: app.log and app.err.log"
        } else {
            Write-Error "Failed to start application in background"
            exit 1
        }
    } else {
        Write-Info "Starting application in foreground..."
        Write-Info "Press Ctrl+C to stop"
        pnpm dev
    }
}

function Test-ApplicationHealth {
    Write-Step "Checking application health..."
    
    $maxAttempts = 30
    $attempt = 0
    
    do {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$WEB_PORT" -Method HEAD -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Success "Application is healthy and responding"
                return $true
            }
        } catch { }
        
        $attempt++
        if ($attempt -ge $maxAttempts) {
            Write-Warning "Application health check timed out"
            return $false
        }
        
        Start-Sleep 2
        Write-Host "." -NoNewline
    } while ($true)
}

function Show-Status {
    Write-Step "System Status"
    
    # Infrastructure status
    Write-Info "Infrastructure Services:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Select-String "postgres|redis"
    
    # Application status
    Write-Info "`nApplication Services:"
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*" }
    if ($nodeProcesses) {
        foreach ($proc in $nodeProcesses) {
            Write-Host "Node.js (PID: $($proc.Id)) - Running" -ForegroundColor Green
        }
    } else {
        Write-Host "Node.js - Not Running" -ForegroundColor Red
    }
    
    # Port status
    Write-Info "`nPort Status:"
    $ports = @($WEB_PORT, $DB_PORT, $REDIS_PORT)
    foreach ($port in $ports) {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
        $service = switch ($port) {
            3000 { "Web App" }
            5432 { "PostgreSQL" }
            6379 { "Redis" }
        }
        
        if ($connection) {
            Write-Host "$service (port $port) - Listening" -ForegroundColor Green
        } else {
            Write-Host "$service (port $port) - Not Available" -ForegroundColor Red
        }
    }
    
    # URLs
    Write-Info "`nAccess URLs:"
    Write-Host "🌐 Web Application: http://localhost:$WEB_PORT" -ForegroundColor Cyan
    Write-Host "🐘 PostgreSQL: localhost:$DB_PORT" -ForegroundColor Cyan
    Write-Host "📡 Redis: localhost:$REDIS_PORT" -ForegroundColor Cyan
}

function Stop-Services {
    Write-Step "Stopping services..."
    
    # Stop Node.js processes
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*" }
    if ($nodeProcesses) {
        Write-Info "Stopping Node.js application..."
        $nodeProcesses | Stop-Process -Force
        Write-Success "Node.js application stopped"
    }
    
    # Stop infrastructure
    Push-Location "infra"
    try {
        Write-Info "Stopping infrastructure services..."
        docker compose down
        Write-Success "Infrastructure services stopped"
    } finally {
        Pop-Location
    }
}

function Remove-AllData {
    Write-Step "Cleaning up all data..."
    
    if (-not $Force) {
        $confirmation = Read-Host "This will remove all data including databases. Are you sure? (y/N)"
        if ($confirmation -ne "y" -and $confirmation -ne "Y") {
            Write-Info "Cleanup cancelled"
            return
        }
    }
    
    # Stop services first
    Stop-Services
    
    # Remove volumes
    Push-Location "infra"
    try {
        Write-Info "Removing Docker volumes..."
        docker compose down -v
        docker volume prune -f
        Write-Success "Docker volumes removed"
    } finally {
        Pop-Location
    }
    
    # Clean application files
    if (Test-Path "node_modules") {
        Write-Info "Removing node_modules..."
        Remove-Item "node_modules" -Recurse -Force
        Write-Success "node_modules removed"
    }
    
    if (Test-Path ".next") {
        Write-Info "Removing .next build cache..."
        Remove-Item ".next" -Recurse -Force
        Write-Success ".next cache removed"
    }
    
    if (Test-Path "app.log") { Remove-Item "app.log" -Force }
    if (Test-Path "app.err.log") { Remove-Item "app.err.log" -Force }
    
    Write-Success "Cleanup completed"
}

function Show-Logs {
    Write-Step "Showing logs..."
    
    Write-Info "Infrastructure logs (last 50 lines):"
    Push-Location "infra"
    try {
        docker compose logs --tail=50
    } finally {
        Pop-Location
    }
    
    if (Test-Path "app.log") {
        Write-Info "`nApplication logs (last 50 lines):"
        Get-Content "app.log" -Tail 50
    }
    
    if (Test-Path "app.err.log") {
        Write-Info "`nApplication error logs (last 50 lines):"
        Get-Content "app.err.log" -Tail 50
    }
}

function Install-Prerequisites {
    Write-Step "Installing prerequisites..."
    
    # Check if running as administrator (for Windows package managers)
    if ($IsWindows) {
        $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
        $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
        $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
        
        if (-not $isAdmin) {
            Write-Warning "For automatic installation on Windows, please run as Administrator"
            Write-Info "Or install manually:"
            Write-Info "  - Docker Desktop: https://docs.docker.com/desktop/install/windows-install/"
            Write-Info "  - Node.js: https://nodejs.org/"
            Write-Info "  - pnpm: npm install -g pnpm"
            return
        }
    }
    
    # Install based on platform
    if ($IsWindows) {
        # Check for Chocolatey
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            Write-Info "Installing with Chocolatey..."
            choco install docker-desktop nodejs pnpm -y
        } elseif (Get-Command winget -ErrorAction SilentlyContinue) {
            Write-Info "Installing with winget..."
            winget install Docker.DockerDesktop
            winget install OpenJS.NodeJS
            npm install -g pnpm
        } else {
            Write-Warning "No package manager found. Please install manually."
        }
    } elseif ($IsMacOS) {
        # Check for Homebrew
        if (Get-Command brew -ErrorAction SilentlyContinue) {
            Write-Info "Installing with Homebrew..."
            brew install --cask docker
            brew install node
            npm install -g pnpm
        } else {
            Write-Warning "Homebrew not found. Please install manually."
        }
    } else {
        # Linux
        Write-Info "Please install prerequisites using your package manager:"
        Write-Info "Ubuntu/Debian: apt update && apt install docker.io docker-compose nodejs npm"
        Write-Info "RHEL/CentOS: yum install docker docker-compose nodejs npm"
        Write-Info "Then: npm install -g pnpm"
    }
}

# Main execution
Write-Host "🤖 AI Companion Local Deployment Tool" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta
Write-Host ""

try {
    switch ($Action) {
        "install" {
            Install-Prerequisites
        }
        "start" {
            if (-not $SkipDeps) { Test-Prerequisites }
            Initialize-Environment
            Start-Infrastructure
            Wait-ForServices
            Initialize-Database
            
            Write-Success "Setup completed successfully!"
            Write-Info "Starting application..."
            Write-Host ""
            
            if ($Detached) {
                Start-Application
                Start-Sleep 10
                if (Test-ApplicationHealth) {
                    Show-Status
                    Write-Host ""
                    Write-Success "🎉 AI Companion is running!"
                    Write-Info "Access the application at: http://localhost:$WEB_PORT"
                    Write-Info "Use './deploy.ps1 status' to check system status"
                    Write-Info "Use './deploy.ps1 logs' to view logs"
                    Write-Info "Use './deploy.ps1 stop' to stop all services"
                }
            } else {
                Write-Host "🎉 Setup complete! Application starting..." -ForegroundColor Green
                Write-Host "Access the application at: http://localhost:$WEB_PORT" -ForegroundColor Cyan
                Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
                Write-Host ""
                Start-Application
            }
        }
        "stop" {
            Stop-Services
            Write-Success "All services stopped"
        }
        "restart" {
            Stop-Services
            Start-Sleep 3
            Start-Infrastructure
            Wait-ForServices
            Start-Application
        }
        "status" {
            Show-Status
        }
        "cleanup" {
            Remove-AllData
        }
        "logs" {
            Show-Logs
        }
        default {
            Write-Error "Unknown action: $Action"
            Get-Help $MyInvocation.MyCommand.Path
            exit 1
        }
    }
} catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
    Write-Info "Check logs for more details"
    exit 1
}