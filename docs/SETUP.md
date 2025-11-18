# 📚 MCP System Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running Servers](#running-servers)
5. [Claude Integration](#claude-integration)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|-------------|
| Node.js | ≥ 18.0.0 | [Download](https://nodejs.org) |
| npm | ≥ 8.0.0 | Comes with Node.js |

### Optional Software

| Software | Version | Purpose |
|----------|---------|---------|
| Python | ≥ 3.8 | For Python-based MCP servers |
| pip | Latest | Python package manager |
| Git | Latest | Version control |

### Platform-Specific Requirements

#### Windows
- PowerShell 5.0+ or Windows Terminal
- Visual C++ Redistributable (for some Node.js modules)

#### macOS
- Xcode Command Line Tools: `xcode-select --install`
- Homebrew (recommended): `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

#### Linux
- Build essentials: `sudo apt-get install build-essential` (Ubuntu/Debian)
- Python development headers: `sudo apt-get install python3-dev`

## Installation

### Quick Install (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/MCP.git
cd MCP

# 2. Run the universal installer
node scripts/install.js

# 3. (Optional) Enable global 'mcp' command
npm link
```

### Manual Installation

If the automatic installer fails, follow these steps:

#### Step 1: Install Root Dependencies

```bash
cd MCP
npm install
```

#### Step 2: Install Node.js MCP Servers

```bash
cd servers/filesystem-mcp
npm install

cd ../database-mcp
npm install

cd ../code-assistant-mcp
npm install
```

#### Step 3: Install Python MCP Servers

```bash
cd servers/web-search-mcp
pip3 install -r requirements.txt
```

#### Step 4: Create Environment File

```bash
cd ../..
cp .env.example .env
# Edit .env and add your API keys
```

## Configuration

### Basic Configuration

The main configuration file is `config/mcp.json`:

```json
{
  "mcpServers": {
    "your-server": {
      "command": "node",
      "args": ["../servers/your-server/index.js"],
      "cwd": "config",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Required for web-search-mcp
SEARCH_API_KEY=your_api_key_here

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=mcp_user
DB_PASSWORD=secure_password

# Logging
MCP_LOG_LEVEL=info  # debug, info, warn, error
MCP_LOG_FILE=logs/mcp.log
```

### Server-Specific Configuration

Each server can have its own configuration:

#### Filesystem MCP
```json
{
  "filesystem-mcp": {
    "allowedPaths": ["/home/user/documents"],
    "deniedPaths": ["/etc", "/sys"],
    "maxFileSize": "10MB"
  }
}
```

#### Web Search MCP
```json
{
  "web-search-mcp": {
    "searchEngine": "duckduckgo",
    "maxResults": 10,
    "timeout": 5000
  }
}
```

## Running Servers

### Using the Launcher Scripts

#### Windows

```cmd
# Command Prompt or PowerShell
launchers\run-all.bat

# PowerShell (alternative)
.\launchers\run-all.ps1
```

#### macOS/Linux

```bash
# Make script executable (first time only)
chmod +x launchers/run-all.sh

# Run the script
./launchers/run-all.sh
```

#### Universal Method (All Platforms)

```bash
node launchers/run-all.js
```

### Using the CLI

If you've run `npm link`, you can use the global `mcp` command:

```bash
# Start all servers
mcp start

# Start specific server
mcp start filesystem-mcp

# Check status
mcp status

# View logs
mcp logs web-search-mcp
```

### Advanced Options

```bash
# Verbose logging
node launchers/run-all.js --verbose

# Start specific server only
node launchers/run-all.js --server filesystem-mcp

# Disable auto-restart
node launchers/run-all.js --no-restart
```

## Claude Integration

### Claude Desktop

#### Windows

1. Locate Claude's configuration directory:
   ```
   %APPDATA%\Claude
   ```

2. Copy or merge `config/mcp.json`:
   ```cmd
   copy config\mcp.json "%APPDATA%\Claude\config.json"
   ```

#### macOS

1. Locate Claude's configuration directory:
   ```
   ~/Library/Application Support/Claude
   ```

2. Copy or merge configuration:
   ```bash
   cp config/mcp.json ~/Library/Application\ Support/Claude/config.json
   ```

#### Linux

1. Locate Claude's configuration directory:
   ```
   ~/.config/claude
   ```

2. Copy or merge configuration:
   ```bash
   cp config/mcp.json ~/.config/claude/config.json
   ```

### Claude VS Code Extension

1. Open VS Code settings (`Cmd/Ctrl + ,`)
2. Search for "MCP"
3. Set `mcp.configurationFile` to the absolute path of `MCP/config/mcp.json`

Or add to `settings.json`:

```json
{
  "mcp.configurationFile": "/absolute/path/to/MCP/config/mcp.json",
  "mcp.autoStart": true,
  "mcp.logLevel": "info"
}
```

### Verifying Integration

1. Start your MCP servers
2. Open Claude Desktop or VS Code
3. Look for MCP connection status
4. Try using an MCP tool in Claude

Example prompt to test:
```
"Use the filesystem MCP to list files in the current directory"
```

## Troubleshooting

### Common Issues

#### Issue: "Command not found: node"

**Solution:**
- Install Node.js from https://nodejs.org
- Verify installation: `node --version`

#### Issue: "Permission denied" on macOS/Linux

**Solution:**
```bash
chmod +x launchers/run-all.sh
chmod +x scripts/install.js
chmod +x cli/mcp-cli.js
```

#### Issue: "Python/pip not found"

**Solution:**

Windows:
```cmd
# Install Python from python.org
# Or use winget
winget install Python.Python.3
```

macOS:
```bash
brew install python
```

Linux:
```bash
sudo apt-get update
sudo apt-get install python3 python3-pip
```

#### Issue: "Port already in use"

**Solution:**

Find and kill the process:
```bash
# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### Issue: MCP servers crash immediately

**Solution:**

1. Check logs:
   ```bash
   node launchers/run-all.js --verbose
   ```

2. Verify dependencies:
   ```bash
   node scripts/install.js
   ```

3. Check configuration:
   ```bash
   cat config/mcp.json | json_pp  # Pretty print JSON
   ```

### Debug Mode

Enable debug logging:

```bash
# Environment variable
export MCP_LOG_LEVEL=debug

# Or in .env file
MCP_LOG_LEVEL=debug

# Run with verbose output
node launchers/run-all.js --verbose
```

### Getting Help

1. Check the logs in `logs/` directory
2. Run health check: `mcp health`
3. Check GitHub Issues: https://github.com/yourusername/MCP/issues
4. Join Discord: https://discord.gg/mcp-community

## Next Steps

1. [Create your own MCP server](CREATE_SERVER.md)
2. [API Documentation](API.md)
3. [Best Practices](BEST_PRACTICES.md)
4. [Contributing](../CONTRIBUTING.md)