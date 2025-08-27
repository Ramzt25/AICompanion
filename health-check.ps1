#!/usr/bin/env pwsh
<#
.SYNOPSIS
AI Companion Health Check and Diagnostics Tool

.DESCRIPTION
Comprehensive health check script that validates all system components,
diagnoses issues, and provides recommendations for fixes.

.PARAMETER Deep
Perform deep health checks including API validation

.PARAMETER Fix
Automatically attempt to fix common issues

.EXAMPLE
./health-check.ps1
./health-check.ps1 -Deep
./health-check.ps1 -Fix

#>

param(
    [switch]$Deep,
    [switch]$Fix,
    [switch]$Help
)

# Import functions from deploy script
. "$PSScriptRoot/deploy.ps1" -Action status 2>$null || $true

if ($Help) {
    Get-Help $MyInvocation.MyCommand.Path -Detailed
    exit 0
}

function Test-Port {
    param($Port, $Host = "localhost")
    try {
        $connection = Test-NetConnection -ComputerName $Host -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return $connection
    } catch {
        return $false
    }
}

function Test-HttpEndpoint {
    param($Url, $Timeout = 10)
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec $Timeout -ErrorAction Stop
        return @{
            Success = $true
            StatusCode = $response.StatusCode
            ResponseTime = $response.ResponseTime
        }
    } catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Test-DatabaseConnection {
    try {
        $env = Get-Content ".env.local" -ErrorAction SilentlyContinue | Where-Object { $_ -match "DATABASE_URL=" }
        if (-not $env) {
            return @{ Success = $false; Error = "DATABASE_URL not found in .env.local" }
        }
        
        # Extract connection details
        $dbUrl = ($env -split "=", 2)[1]
        
        # Test using docker exec if container is running
        $containerName = "infra-postgres-1"
        $result = docker exec $containerName pg_isready -U postgres 2>$null
        if ($LASTEXITCODE -eq 0) {
            return @{ Success = $true; Message = "Database connection successful" }
        } else {
            return @{ Success = $false; Error = "Database not ready or container not running" }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Test-RedisConnection {
    try {
        $containerName = "infra-redis-1"
        $result = docker exec $containerName redis-cli ping 2>$null
        if ($LASTEXITCODE -eq 0 -and $result -eq "PONG") {
            return @{ Success = $true; Message = "Redis connection successful" }
        } else {
            return @{ Success = $false; Error = "Redis not ready or container not running" }
        }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Test-OpenAIApiKey {
    try {
        $env = Get-Content ".env.local" -ErrorAction SilentlyContinue | Where-Object { $_ -match "OPENAI_API_KEY=" }
        if (-not $env) {
            return @{ Success = $false; Error = "OPENAI_API_KEY not found in .env.local" }
        }
        
        $apiKey = ($env -split "=", 2)[1]
        if ($apiKey -eq "your-openai-api-key-here" -or [string]::IsNullOrWhiteSpace($apiKey)) {
            return @{ Success = $false; Error = "OpenAI API key not configured (still placeholder)" }
        }
        
        if ($Deep) {
            Write-Info "Testing OpenAI API key..."
            $headers = @{
                "Authorization" = "Bearer $apiKey"
                "Content-Type" = "application/json"
            }
            
            $response = Invoke-RestMethod -Uri "https://api.openai.com/v1/models" -Headers $headers -TimeoutSec 10 -ErrorAction Stop
            if ($response.data) {
                return @{ Success = $true; Message = "OpenAI API key valid and working" }
            } else {
                return @{ Success = $false; Error = "OpenAI API returned unexpected response" }
            }
        } else {
            return @{ Success = $true; Message = "OpenAI API key configured (not tested)" }
        }
    } catch {
        return @{ Success = $false; Error = "OpenAI API test failed: $($_.Exception.Message)" }
    }
}

function Test-DockerServices {
    try {
        $services = docker ps --format "{{.Names}}" | Where-Object { $_ -match "(postgres|redis)" }
        $expected = @("infra-postgres-1", "infra-redis-1")
        $missing = $expected | Where-Object { $_ -notin $services }
        
        if ($missing.Count -eq 0) {
            return @{ Success = $true; Message = "All Docker services running" }
        } else {
            return @{ Success = $false; Error = "Missing services: $($missing -join ', ')" }
        }
    } catch {
        return @{ Success = $false; Error = "Docker not available or services not running" }
    }
}

function Test-NodeApplication {
    $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*" }
    if ($processes) {
        return @{ Success = $true; Message = "Node.js application running (PID: $($processes[0].Id))" }
    } else {
        return @{ Success = $false; Error = "Node.js application not running" }
    }
}

function Test-EnvironmentFile {
    if (-not (Test-Path ".env.local")) {
        return @{ Success = $false; Error = ".env.local file not found" }
    }
    
    $envContent = Get-Content ".env.local"
    $requiredVars = @("DATABASE_URL", "REDIS_URL", "NEXTAUTH_SECRET", "OPENAI_API_KEY")
    $missing = @()
    
    foreach ($var in $requiredVars) {
        $found = $envContent | Where-Object { $_ -match "^$var=" }
        if (-not $found) {
            $missing += $var
        }
    }
    
    if ($missing.Count -eq 0) {
        return @{ Success = $true; Message = "All required environment variables present" }
    } else {
        return @{ Success = $false; Error = "Missing environment variables: $($missing -join ', ')" }
    }
}

function Test-Dependencies {
    if (-not (Test-Path "node_modules")) {
        return @{ Success = $false; Error = "node_modules not found - run 'pnpm install'" }
    }
    
    if (-not (Test-Path "node_modules/.pnpm")) {
        return @{ Success = $false; Error = "Dependencies not installed with pnpm" }
    }
    
    return @{ Success = $true; Message = "Dependencies installed correctly" }
}

function Fix-CommonIssues {
    Write-Step "Attempting to fix common issues..."
    
    $fixed = @()
    
    # Fix missing .env.local
    if (-not (Test-Path ".env.local")) {
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env.local"
            $fixed += "Created .env.local from .env.example"
        }
    }
    
    # Fix missing dependencies
    if (-not (Test-Path "node_modules")) {
        Write-Info "Installing dependencies..."
        pnpm install
        if ($LASTEXITCODE -eq 0) {
            $fixed += "Installed dependencies"
        }
    }
    
    # Fix stopped services
    $dockerTest = Test-DockerServices
    if (-not $dockerTest.Success) {
        Write-Info "Starting Docker services..."
        Push-Location "infra"
        try {
            docker compose up -d
            if ($LASTEXITCODE -eq 0) {
                $fixed += "Started Docker services"
            }
        } finally {
            Pop-Location
        }
    }
    
    if ($fixed.Count -gt 0) {
        Write-Success "Fixed issues:"
        $fixed | ForEach-Object { Write-Info "  - $_" }
    } else {
        Write-Info "No automatic fixes available"
    }
}

function Show-Recommendations {
    param($Results)
    
    Write-Step "Recommendations:"
    
    $hasIssues = $false
    
    foreach ($result in $Results) {
        if (-not $result.Test.Success) {
            $hasIssues = $true
            
            switch ($result.Name) {
                "Environment File" {
                    Write-Info "  - Run './deploy.ps1 start' to create environment file"
                }
                "Dependencies" {
                    Write-Info "  - Run 'pnpm install' to install dependencies"
                }
                "Docker Services" {
                    Write-Info "  - Run 'docker compose up -d' in infra/ directory"
                    Write-Info "  - Or run './deploy.ps1 start' for full setup"
                }
                "Database Connection" {
                    Write-Info "  - Ensure PostgreSQL container is running"
                    Write-Info "  - Check DATABASE_URL in .env.local"
                }
                "Redis Connection" {
                    Write-Info "  - Ensure Redis container is running"
                    Write-Info "  - Check REDIS_URL in .env.local"
                }
                "OpenAI API" {
                    Write-Info "  - Add valid OpenAI API key to .env.local"
                    Write-Info "  - Get API key from: https://platform.openai.com/api-keys"
                }
                "Node Application" {
                    Write-Info "  - Start application with 'pnpm dev'"
                    Write-Info "  - Or run './deploy.ps1 start' for full setup"
                }
                "Web Port" {
                    Write-Info "  - Ensure application is running"
                    Write-Info "  - Check if port $WEB_PORT is available"
                }
            }
        }
    }
    
    if (-not $hasIssues) {
        Write-Success "  All systems operational! 🎉"
        Write-Info "  Access your application at: http://localhost:$WEB_PORT"
    } else {
        Write-Info "  Run './deploy.ps1 start' for automatic setup"
        Write-Info "  Use '--fix' flag to attempt automatic fixes"
    }
}

# Main health check execution
Write-Host "🔍 AI Companion Health Check" -ForegroundColor Magenta
Write-Host "=============================" -ForegroundColor Magenta
Write-Host ""

if ($Fix) {
    Fix-CommonIssues
    Write-Host ""
}

# Run health checks
$healthChecks = @(
    @{ Name = "Environment File"; Test = Test-EnvironmentFile }
    @{ Name = "Dependencies"; Test = Test-Dependencies }
    @{ Name = "Docker Services"; Test = Test-DockerServices }
    @{ Name = "Database Connection"; Test = Test-DatabaseConnection }
    @{ Name = "Redis Connection"; Test = Test-RedisConnection }
    @{ Name = "OpenAI API"; Test = Test-OpenAIApiKey }
    @{ Name = "Node Application"; Test = Test-NodeApplication }
    @{ Name = "Web Port"; Test = @{ Success = (Test-Port $WEB_PORT); Message = "Web port $WEB_PORT available" } }
)

Write-Step "Running health checks..."
Write-Host ""

$allHealthy = $true
$results = @()

foreach ($check in $healthChecks) {
    Write-Host "Testing $($check.Name)... " -NoNewline
    
    $result = $check.Test
    $results += @{ Name = $check.Name; Test = $result }
    
    if ($result.Success) {
        Write-Host "✅" -ForegroundColor Green
        if ($result.Message) {
            Write-Host "    $($result.Message)" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌" -ForegroundColor Red
        Write-Host "    $($result.Error)" -ForegroundColor Red
        $allHealthy = $false
    }
}

Write-Host ""

# Deep checks if requested
if ($Deep -and $allHealthy) {
    Write-Step "Running deep health checks..."
    
    # Test API endpoints
    $endpoints = @(
        @{ Name = "Health Endpoint"; Url = "http://localhost:$WEB_PORT/api/health" }
        @{ Name = "Main Page"; Url = "http://localhost:$WEB_PORT" }
    )
    
    foreach ($endpoint in $endpoints) {
        Write-Host "Testing $($endpoint.Name)... " -NoNewline
        $result = Test-HttpEndpoint $endpoint.Url
        
        if ($result.Success) {
            Write-Host "✅ ($($result.StatusCode))" -ForegroundColor Green
        } else {
            Write-Host "❌" -ForegroundColor Red
            Write-Host "    $($result.Error)" -ForegroundColor Red
            $allHealthy = $false
        }
    }
    Write-Host ""
}

# Summary
if ($allHealthy) {
    Write-Success "🎉 All health checks passed!"
    Write-Info "Your AI Companion is ready to use at: http://localhost:$WEB_PORT"
} else {
    Write-Warning "⚠️  Some health checks failed"
    Show-Recommendations $results
}

# System information
Write-Host ""
Write-Step "System Information:"
Write-Info "OS: $(if ($IsWindows) { 'Windows' } elseif ($IsMacOS) { 'macOS' } else { 'Linux' })"
Write-Info "PowerShell: $($PSVersionTable.PSVersion)"
Write-Info "Docker: $(docker --version 2>$null)"
Write-Info "Node.js: $(node --version 2>$null)"
Write-Info "pnpm: v$(pnpm --version 2>$null)"

exit $(if ($allHealthy) { 0 } else { 1 })