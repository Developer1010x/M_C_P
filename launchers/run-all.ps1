# Universal MCP Server Launcher for PowerShell
# Works on Windows PowerShell and PowerShell Core (cross-platform)

param(
    [switch]$Verbose,
    [switch]$NoRestart,
    [string]$Server,
    [switch]$Help
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Define colors
$colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Magenta = "Magenta"
    Cyan = "Cyan"
}

# Banner
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Universal MCP Server Launcher      ║" -ForegroundColor Cyan
Write-Host "║          PowerShell Edition            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Show help if requested
if ($Help) {
    Write-Host "Usage:" -ForegroundColor White
    Write-Host "  .\run-all.ps1 [options]" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Options:" -ForegroundColor White
    Write-Host "  -Help          Show this help message" -ForegroundColor Gray
    Write-Host "  -Verbose       Enable verbose logging" -ForegroundColor Gray
    Write-Host "  -Server <name> Start only specific server" -ForegroundColor Gray
    Write-Host "  -NoRestart     Disable auto-restart" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor White
    Write-Host "  .\run-all.ps1                    # Start all servers" -ForegroundColor Gray
    Write-Host "  .\run-all.ps1 -Verbose           # Start with verbose logging" -ForegroundColor Gray
    Write-Host "  .\run-all.ps1 -Server web-mcp    # Start only web-mcp server" -ForegroundColor Gray
    exit 0
}

# Detect PowerShell version and OS
$PSVersionDisplay = "PowerShell $($PSVersionTable.PSVersion.ToString())"
$OSDisplay = if ($IsWindows -or $PSVersionTable.PSVersion.Major -lt 6) {
    "Windows"
} elseif ($IsMacOS) {
    "macOS"
} elseif ($IsLinux) {
    "Linux"
} else {
    "Unknown"
}

Write-Host "Platform: $OSDisplay | $PSVersionDisplay" -ForegroundColor Magenta

# Check for Node.js
try {
    $nodeVersion = & node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js check failed"
    }
} catch {
    Write-Host "❌ ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js from: https://nodejs.org" -ForegroundColor Yellow

    if ($OSDisplay -eq "Windows") {
        Write-Host "Or use Windows Package Manager: winget install OpenJS.NodeJS" -ForegroundColor Yellow
    }

    exit 1
}

# Check for Python (optional)
try {
    $pythonCmd = if (Get-Command python3 -ErrorAction SilentlyContinue) {
        "python3"
    } elseif (Get-Command python -ErrorAction SilentlyContinue) {
        "python"
    } else {
        $null
    }

    if ($pythonCmd) {
        $pythonVersion = & $pythonCmd --version 2>&1
        Write-Host "✓ Python version: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "⚠ WARNING: Python not found. Python-based MCP servers will not work." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ WARNING: Error checking Python installation." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting MCP servers..." -ForegroundColor Blue
Write-Host "----------------------------------------"

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check if run-all.js exists
$runAllPath = Join-Path $scriptDir "run-all.js"
if (-not (Test-Path $runAllPath)) {
    Write-Host "❌ ERROR: run-all.js not found in $scriptDir" -ForegroundColor Red
    Write-Host "Please ensure the file structure is correct." -ForegroundColor Yellow
    exit 1
}

# Build arguments
$arguments = @()
if ($Verbose) {
    $arguments += "--verbose"
}
if ($NoRestart) {
    $arguments += "--no-restart"
}
if ($Server) {
    $arguments += "--server"
    $arguments += $Server
}

# Function to handle cleanup
function Stop-MCPServers {
    Write-Host ""
    Write-Host "📍 Shutting down MCP servers..." -ForegroundColor Yellow
    # Send Ctrl+C to the Node.js process
    if ($nodeProcess -and !$nodeProcess.HasExited) {
        Stop-Process -Id $nodeProcess.Id -Force
    }
}

# Register cleanup on exit
Register-EngineEvent PowerShell.Exiting -Action { Stop-MCPServers }

# Start Node.js process
try {
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "node"
    $processInfo.Arguments = "run-all.js " + ($arguments -join " ")
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $false
    $processInfo.RedirectStandardError = $false
    $processInfo.WorkingDirectory = $scriptDir

    $nodeProcess = [System.Diagnostics.Process]::Start($processInfo)

    # Wait for the process to exit
    $nodeProcess.WaitForExit()
    $exitCode = $nodeProcess.ExitCode

    if ($exitCode -ne 0) {
        Write-Host ""
        Write-Host "════════════════════════════════════════" -ForegroundColor Red
        Write-Host " MCP servers stopped with error code $exitCode" -ForegroundColor Red
        Write-Host "════════════════════════════════════════" -ForegroundColor Red
        exit $exitCode
    }

    Write-Host ""
    Write-Host "════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  All MCP servers stopped normally" -ForegroundColor Green
    Write-Host "════════════════════════════════════════" -ForegroundColor Green

} catch {
    Write-Host "❌ ERROR: Failed to start MCP servers" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}