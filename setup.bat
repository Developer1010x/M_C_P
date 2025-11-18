@echo off
REM ============================================================================
REM Universal MCP Setup Script for Windows (Batch Version)
REM Automatically detects and uses the best installation method
REM ============================================================================

setlocal enabledelayedexpansion

echo ============================================================
echo.
echo          Universal MCP System Auto-Installer
echo.
echo      Complete setup with zero technical knowledge!
echo.
echo ============================================================
echo.

REM Check if PowerShell is available and execution policy allows scripts
powershell -Command "Get-ExecutionPolicy" >nul 2>&1
if %errorlevel% equ 0 (
    echo PowerShell detected. Using advanced installer...
    echo.

    REM Try to run PowerShell script
    powershell -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

    if !errorlevel! equ 0 (
        goto :success
    ) else (
        echo.
        echo PowerShell script failed. Falling back to basic installer...
        echo.
    )
)

echo Running basic installation...
echo.

REM ============================================================================
REM Basic Installation (when PowerShell is not available)
REM ============================================================================

echo Step 1: Checking for Node.js...
echo --------------------------------

where node >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js is installed
    node --version
) else (
    echo [WARNING] Node.js is not installed!
    echo.
    echo Please install Node.js manually:
    echo   1. Go to https://nodejs.org
    echo   2. Download LTS version
    echo   3. Run the installer
    echo   4. Restart this setup script
    echo.
    pause
    exit /b 1
)

echo.
echo Step 2: Checking for npm...
echo ---------------------------

where npm >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] npm is installed
    npm --version
) else (
    echo [ERROR] npm is not found!
    echo Please reinstall Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo.
echo Step 3: Installing MCP dependencies...
echo --------------------------------------

cd /d "%~dp0"

if exist "scripts\install.js" (
    echo Running MCP installer...
    node scripts\install.js

    if !errorlevel! neq 0 (
        echo.
        echo [ERROR] Installation failed!
        pause
        exit /b 1
    )
) else (
    echo [ERROR] Cannot find scripts\install.js
    echo Make sure you're running this from the MCP directory.
    pause
    exit /b 1
)

echo.
echo Step 4: Creating environment file...
echo ------------------------------------

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [OK] Created .env file from template
    ) else (
        echo # MCP Environment Configuration > .env
        echo MCP_LOG_LEVEL=info >> .env
        echo NODE_ENV=production >> .env
        echo [OK] Created basic .env file
    )
) else (
    echo [OK] .env file already exists
)

echo.
echo Step 5: Creating start script...
echo --------------------------------

echo @echo off > start.bat
echo cd /d "%%~dp0" >> start.bat
echo echo Starting MCP servers... >> start.bat
echo node launchers\run-all.js >> start.bat
echo pause >> start.bat

echo [OK] Created start.bat

echo.
echo Step 6: Setting up global command...
echo ------------------------------------

npm link >nul 2>&1
if !errorlevel! equ 0 (
    echo [OK] Global 'mcp' command installed
    echo      You can now use: mcp start
) else (
    echo [INFO] Could not install global command
    echo        You can use: node cli\mcp-cli.js
)

:success
echo.
echo ============================================================
echo.
echo          Installation Complete!
echo.
echo ============================================================
echo.
echo Quick Start:
echo   - Double-click start.bat to run MCP servers
echo   - Or run: node launchers\run-all.js
echo.
echo CLI Commands:
echo   - node cli\mcp-cli.js list    (list servers)
echo   - node cli\mcp-cli.js start   (start servers)
echo   - node cli\mcp-cli.js help    (show help)
echo.
echo Next Steps:
echo   1. Edit .env file to add API keys (optional)
echo   2. Read docs\README.md for documentation
echo.

choice /C YN /M "Start MCP servers now?"
if !errorlevel! equ 1 (
    echo.
    echo Starting MCP servers...
    node launchers\run-all.js
)

pause