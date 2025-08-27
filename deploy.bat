@echo off
REM AI Companion Local Deployment - Windows Batch Wrapper
REM This script launches the PowerShell deployment script

setlocal EnableDelayedExpansion

echo 🤖 AI Companion Local Deployment Tool
echo ======================================
echo.

REM Check if PowerShell is available
where pwsh >nul 2>&1
if %errorlevel% equ 0 (
    echo Using PowerShell 7...
    pwsh -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" %*
) else (
    where powershell >nul 2>&1
    if %errorlevel% equ 0 (
        echo Using Windows PowerShell...
        echo Warning: PowerShell 7+ is recommended for best compatibility
        powershell -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" %*
    ) else (
        echo ERROR: PowerShell not found!
        echo Please install PowerShell 7 from: https://github.com/PowerShell/PowerShell
        pause
        exit /b 1
    )
)

endlocal