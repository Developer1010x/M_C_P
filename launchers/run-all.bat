@echo off
REM Universal MCP Server Launcher for Windows
REM Automatically detects Node.js and starts all MCP servers

setlocal enabledelayedexpansion

echo ========================================
echo     Universal MCP Server Launcher
echo           Windows Edition
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Get Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%

REM Check if Python is installed (for Python-based MCP servers)
where python >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
    echo Python version: !PYTHON_VERSION!
) else (
    where python3 >nul 2>nul
    if %errorlevel% equ 0 (
        for /f "tokens=*" %%i in ('python3 --version 2^>^&1') do set PYTHON_VERSION=%%i
        echo Python version: !PYTHON_VERSION!
    ) else (
        echo WARNING: Python not found. Python-based MCP servers will not work.
    )
)

echo.
echo Starting MCP servers...
echo ----------------------------------------

REM Navigate to the launcher directory
cd /d "%~dp0"

REM Check if run-all.js exists
if not exist "run-all.js" (
    echo ERROR: run-all.js not found in %~dp0
    echo Please ensure the file structure is correct.
    pause
    exit /b 1
)

REM Parse command line arguments
set ARGS=
:parse_args
if "%~1"=="" goto :run_server
set ARGS=%ARGS% %1
shift
goto :parse_args

:run_server
REM Run the Node.js launcher with any provided arguments
node run-all.js %ARGS%

REM Check exit code
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo  MCP servers stopped with error code %errorlevel%
    echo ========================================
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================
echo    All MCP servers stopped normally
echo ========================================
pause