# ============================================================================
# Universal MCP Setup Script for Windows PowerShell
# Automatically installs ALL prerequisites and dependencies
# No prior technical knowledge required!
# ============================================================================

# Requires PowerShell 5.0 or later
#Requires -Version 5.0

# Set error action
$ErrorActionPreference = "Stop"

# Enable TLS 1.2 for downloads
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Script configuration
$RequiredNodeVersion = 18
$RequiredPythonVersion = "3.8"
$InstallDir = $PSScriptRoot
$LogFile = Join-Path $InstallDir "setup.log"

# Start transcript for logging
Start-Transcript -Path $LogFile -Append

# Colors for output (Windows Terminal and PowerShell 7+ support)
if ($PSVersionTable.PSVersion.Major -ge 7 -or $env:WT_SESSION) {
    $esc = [char]27
    $red = "$esc[31m"
    $green = "$esc[32m"
    $yellow = "$esc[33m"
    $blue = "$esc[34m"
    $magenta = "$esc[35m"
    $cyan = "$esc[36m"
    $bold = "$esc[1m"
    $reset = "$esc[0m"
} else {
    $red = ""; $green = ""; $yellow = ""; $blue = ""; $magenta = ""; $cyan = ""; $bold = ""; $reset = ""
}

# Clear screen and show banner
Clear-Host
Write-Host "${cyan}╔════════════════════════════════════════════════════════╗${reset}"
Write-Host "${cyan}║                                                        ║${reset}"
Write-Host "${cyan}║         ${bold}Universal MCP System Auto-Installer${reset}${cyan}           ║${reset}"
Write-Host "${cyan}║                                                        ║${reset}"
Write-Host "${cyan}║     Complete setup with zero technical knowledge!      ║${reset}"
Write-Host "${cyan}║                                                        ║${reset}"
Write-Host "${cyan}╚════════════════════════════════════════════════════════╝${reset}"
Write-Host ""
Write-Host "${magenta}System: Windows | PowerShell $($PSVersionTable.PSVersion)${reset}"
Write-Host "${magenta}Architecture: $([System.Environment]::Is64BitOperatingSystem ? 'x64' : 'x86')${reset}"
Write-Host "${magenta}Install Location: $InstallDir${reset}"
Write-Host ""
Write-Host "${yellow}This script will:${reset}"
Write-Host "  1. Install Node.js (if needed)"
Write-Host "  2. Install Python (if needed)"
Write-Host "  3. Install all MCP dependencies"
Write-Host "  4. Configure your environment"
Write-Host "  5. Set up global commands"
Write-Host "  6. Verify everything works"
Write-Host ""
Write-Host "Press any key to continue or Ctrl+C to cancel..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Function to test if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to check if command exists
function Test-CommandExists {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction SilentlyContinue) {
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

# Function to compare versions
function Compare-Version {
    param(
        [string]$Version1,
        [string]$Version2
    )
    try {
        $v1 = [Version]$Version1.Replace('v', '').Split('-')[0]
        $v2 = [Version]$Version2.Replace('v', '').Split('-')[0]
        return $v1.CompareTo($v2)
    } catch {
        return -1
    }
}

# Function to add to PATH
function Add-ToPath {
    param($Path)

    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$Path*") {
        Write-Host "Adding $Path to USER PATH..."
        [Environment]::SetEnvironmentVariable(
            "Path",
            "$currentPath;$Path",
            "User"
        )
        $env:Path = "$env:Path;$Path"
        Write-Host "${green}✓ Added to PATH${reset}"
    }
}

# Function to download file with progress
function Download-File {
    param(
        [string]$Url,
        [string]$OutFile
    )

    Write-Host "Downloading from $Url..."

    try {
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($Url, $OutFile)
        Write-Host "${green}✓ Downloaded successfully${reset}"
    } catch {
        Write-Host "${red}✗ Download failed: $_${reset}"
        throw
    }
}

# Function to install Chocolatey
function Install-Chocolatey {
    if (!(Test-CommandExists choco)) {
        Write-Host "${yellow}Installing Chocolatey package manager...${reset}"

        try {
            Set-ExecutionPolicy Bypass -Scope Process -Force
            Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

            # Refresh environment
            $env:ChocolateyInstall = "$env:ProgramData\chocolatey"
            $env:Path = "$env:Path;$env:ChocolateyInstall\bin"

            Write-Host "${green}✓ Chocolatey installed successfully${reset}"
        } catch {
            Write-Host "${red}✗ Failed to install Chocolatey${reset}"
            return $false
        }
    } else {
        Write-Host "${green}✓ Chocolatey is already installed${reset}"
    }
    return $true
}

# Function to install Node.js
function Install-NodeJS {
    Write-Host "`n${yellow}📦 Installing Node.js...${reset}"

    # Try winget first (Windows 11 / Windows 10 with App Installer)
    if (Test-CommandExists winget) {
        Write-Host "Using Windows Package Manager (winget)..."
        try {
            winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements

            # Refresh PATH
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                       [System.Environment]::GetEnvironmentVariable("Path", "User")

            Write-Host "${green}✓ Node.js installed via winget${reset}"
            return
        } catch {
            Write-Host "${yellow}⚠ Winget installation failed, trying alternative...${reset}"
        }
    }

    # Try Chocolatey
    if (Install-Chocolatey) {
        try {
            choco install nodejs-lts -y --force

            # Refresh PATH
            refreshenv
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                       [System.Environment]::GetEnvironmentVariable("Path", "User")

            Write-Host "${green}✓ Node.js installed via Chocolatey${reset}"
            return
        } catch {
            Write-Host "${yellow}⚠ Chocolatey installation failed, trying direct download...${reset}"
        }
    }

    # Direct download as last resort
    Write-Host "Downloading Node.js installer directly..."
    $nodeUrl = "https://nodejs.org/dist/latest-v18.x/"
    $nodeMsi = "node-v18-x64.msi"

    try {
        # Get latest v18 version
        $webContent = (New-Object System.Net.WebClient).DownloadString($nodeUrl)
        if ($webContent -match 'node-v(18\.\d+\.\d+)-x64\.msi') {
            $nodeMsi = $matches[0]
            $downloadUrl = "$nodeUrl$nodeMsi"
            $installerPath = Join-Path $env:TEMP $nodeMsi

            Download-File -Url $downloadUrl -OutFile $installerPath

            Write-Host "Installing Node.js..."
            Start-Process msiexec.exe -ArgumentList "/i", "`"$installerPath`"", "/quiet", "/norestart" -Wait

            # Refresh PATH
            $nodePath = Join-Path $env:ProgramFiles "nodejs"
            Add-ToPath $nodePath

            Write-Host "${green}✓ Node.js installed successfully${reset}"
        } else {
            throw "Could not find Node.js download link"
        }
    } catch {
        Write-Host "${red}✗ Failed to install Node.js: $_${reset}"
        Write-Host "${yellow}Please install Node.js manually from https://nodejs.org${reset}"
        exit 1
    }
}

# Function to install Python
function Install-Python {
    Write-Host "`n${yellow}🐍 Installing Python...${reset}"

    # Try winget first
    if (Test-CommandExists winget) {
        Write-Host "Using Windows Package Manager (winget)..."
        try {
            winget install Python.Python.3.11 --accept-package-agreements --accept-source-agreements

            # Refresh PATH
            $pythonPath = Join-Path $env:LOCALAPPDATA "Programs\Python\Python311"
            $pythonScripts = Join-Path $pythonPath "Scripts"
            Add-ToPath $pythonPath
            Add-ToPath $pythonScripts

            Write-Host "${green}✓ Python installed via winget${reset}"
            return
        } catch {
            Write-Host "${yellow}⚠ Winget installation failed, trying alternative...${reset}"
        }
    }

    # Try Chocolatey
    if (Test-CommandExists choco) {
        try {
            choco install python3 -y --force
            refreshenv
            Write-Host "${green}✓ Python installed via Chocolatey${reset}"
            return
        } catch {
            Write-Host "${yellow}⚠ Chocolatey installation failed, trying direct download...${reset}"
        }
    }

    # Direct download
    Write-Host "Downloading Python installer directly..."
    $pythonUrl = "https://www.python.org/ftp/python/3.11.7/python-3.11.7-amd64.exe"
    $installerPath = Join-Path $env:TEMP "python-installer.exe"

    try {
        Download-File -Url $pythonUrl -OutFile $installerPath

        Write-Host "Installing Python..."
        Start-Process -FilePath $installerPath -ArgumentList "/quiet", "InstallAllUsers=0", "PrependPath=1", "Include_test=0" -Wait

        # Refresh PATH
        $pythonPath = Join-Path $env:LOCALAPPDATA "Programs\Python\Python311"
        $pythonScripts = Join-Path $pythonPath "Scripts"
        Add-ToPath $pythonPath
        Add-ToPath $pythonScripts

        Write-Host "${green}✓ Python installed successfully${reset}"
    } catch {
        Write-Host "${yellow}⚠ Python installation failed (optional)${reset}"
    }
}

# Main installation process
function Main {
    Write-Host "`n${bold}${blue}Step 1: Checking prerequisites...${reset}"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check for admin rights (optional, warn if not admin)
    if (!(Test-Administrator)) {
        Write-Host "${yellow}⚠ Not running as Administrator${reset}"
        Write-Host "  Some features may require manual configuration"
    }

    # Check and install Node.js
    $nodeInstalled = $false
    if (Test-CommandExists node) {
        $nodeVersion = node --version
        Write-Host "Found Node.js $nodeVersion"

        $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($majorVersion -ge $RequiredNodeVersion) {
            Write-Host "${green}✓ Node.js $nodeVersion is installed${reset}"
            $nodeInstalled = $true
        } else {
            Write-Host "${yellow}⚠ Node.js version is too old ($nodeVersion)${reset}"
            Install-NodeJS
        }
    } else {
        Write-Host "${yellow}⚠ Node.js not found${reset}"
        Install-NodeJS
    }

    # Verify Node.js installation
    if (!(Test-CommandExists node)) {
        # Try refreshing PATH one more time
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                   [System.Environment]::GetEnvironmentVariable("Path", "User")

        if (!(Test-CommandExists node)) {
            Write-Host "${red}✗ Node.js installation failed${reset}"
            Write-Host "Please install Node.js manually from https://nodejs.org"
            exit 1
        }
    }

    # Check npm
    if (!(Test-CommandExists npm)) {
        Write-Host "${red}✗ npm not found${reset}"
        Write-Host "Please reinstall Node.js from https://nodejs.org"
        exit 1
    } else {
        $npmVersion = npm --version
        Write-Host "${green}✓ npm $npmVersion is installed${reset}"
    }

    # Check and optionally install Python
    $pythonCmd = $null
    if (Test-CommandExists python) {
        $pythonCmd = "python"
    } elseif (Test-CommandExists python3) {
        $pythonCmd = "python3"
    } elseif (Test-CommandExists py) {
        $pythonCmd = "py -3"
    }

    if ($pythonCmd) {
        $pythonVersion = & $pythonCmd --version 2>&1
        Write-Host "${green}✓ Python is installed: $pythonVersion${reset}"
    } else {
        Write-Host "${yellow}⚠ Python not found (optional)${reset}"
        $response = Read-Host "Install Python? (y/n)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Install-Python
        }
    }

    Write-Host "`n${bold}${blue}Step 2: Installing MCP dependencies...${reset}"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Run the MCP installer
    $installerPath = Join-Path $InstallDir "scripts\install.js"
    if (Test-Path $installerPath) {
        Write-Host "Running MCP installer..."
        & node $installerPath
        if ($LASTEXITCODE -ne 0) {
            Write-Host "${red}✗ MCP installer failed${reset}"
            exit 1
        }
    } else {
        Write-Host "${red}✗ MCP installer not found${reset}"
        Write-Host "Are you in the MCP directory?"
        exit 1
    }

    Write-Host "`n${bold}${blue}Step 3: Setting up environment...${reset}"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Create .env file if it doesn't exist
    $envFile = Join-Path $InstallDir ".env"
    $envExample = Join-Path $InstallDir ".env.example"

    if (!(Test-Path $envFile)) {
        if (Test-Path $envExample) {
            Copy-Item $envExample $envFile
            Write-Host "${green}✓ Created .env file from template${reset}"
        } else {
            Write-Host "${yellow}⚠ Creating basic .env file${reset}"
            @"
# MCP Environment Configuration
# Auto-generated by setup script
MCP_LOG_LEVEL=info
NODE_ENV=production
"@ | Set-Content $envFile
        }
    } else {
        Write-Host "${green}✓ .env file already exists${reset}"
    }

    Write-Host "`n${bold}${blue}Step 4: Setting up global commands...${reset}"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Try to set up global mcp command
    try {
        Write-Host "Installing global mcp command..."
        & npm link 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "${green}✓ Global 'mcp' command installed${reset}"
        } else {
            throw "npm link failed"
        }
    } catch {
        Write-Host "${yellow}⚠ Could not install global command${reset}"
        Write-Host "  You can still use: node cli\mcp-cli.js"
    }

    # Create convenient start script
    $startBat = Join-Path $InstallDir "start.bat"
    @"
@echo off
cd /d "%~dp0"
node launchers\run-all.js
pause
"@ | Set-Content $startBat
    Write-Host "${green}✓ Created start.bat for easy launching${reset}"

    Write-Host "`n${bold}${blue}Step 5: Verifying installation...${reset}"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Run health check
    $healthCheck = Join-Path $InstallDir "cli\mcp-cli.js"
    & node $healthCheck health 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "${green}✓ MCP system is healthy${reset}"
    } else {
        Write-Host "${yellow}⚠ Health check had warnings${reset}"
    }

    # List available servers
    Write-Host "`n${cyan}Available MCP Servers:${reset}"
    & node $healthCheck list 2>$null

    # Success message
    Write-Host ""
    Write-Host "${green}╔════════════════════════════════════════════════════════╗${reset}"
    Write-Host "${green}║                                                        ║${reset}"
    Write-Host "${green}║         🎉 Installation Complete! 🎉                   ║${reset}"
    Write-Host "${green}║                                                        ║${reset}"
    Write-Host "${green}╚════════════════════════════════════════════════════════╝${reset}"
    Write-Host ""
    Write-Host "${bold}Quick Start Commands:${reset}"
    Write-Host ""
    Write-Host "  ${cyan}Start all servers:${reset}"
    Write-Host "    .\start.bat"
    Write-Host "    ${magenta}or${reset}"
    Write-Host "    node launchers\run-all.js"
    Write-Host ""
    Write-Host "  ${cyan}Use MCP CLI:${reset}"

    if (Test-CommandExists mcp) {
        Write-Host "    mcp start"
        Write-Host "    mcp status"
        Write-Host "    mcp help"
    } else {
        Write-Host "    node cli\mcp-cli.js start"
        Write-Host "    node cli\mcp-cli.js status"
        Write-Host "    node cli\mcp-cli.js help"
    }

    Write-Host ""
    Write-Host "${yellow}📝 Notes:${reset}"
    Write-Host "  • Logs saved to: $LogFile"
    Write-Host "  • Edit .env file to add API keys"
    Write-Host "  • Documentation: docs\SETUP.md"
    Write-Host ""

    # Ask if user wants to start servers now
    $response = Read-Host "Start MCP servers now? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "`n${cyan}Starting MCP servers...${reset}"
        & node (Join-Path $InstallDir "launchers\run-all.js")
    }
}

# Error handler
trap {
    Write-Host "${red}✗ Installation failed!${reset}"
    Write-Host "Error: $_"
    Write-Host "Check $LogFile for details"
    Stop-Transcript
    exit 1
}

# Run main installation
try {
    Main
} finally {
    Stop-Transcript
}