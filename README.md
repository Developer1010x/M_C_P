# 🚀 Universal MCP System - Cross-Platform Model Context Protocol Toolkit

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![Python Version](https://img.shields.io/badge/python-%3E%3D3.8-blue)](https://python.org)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com)

## 🎯 One MCP System. All Platforms. All Applications.

A production-ready, globally accessible MCP (Model Context Protocol) management system that works seamlessly across:
- ✅ **Windows** (PowerShell, CMD, WSL)
- ✅ **macOS** (Intel & Apple Silicon)
- ✅ **Linux** (Ubuntu, Debian, Fedora, Arch, etc.)
- ✅ **Claude Desktop**
- ✅ **Claude VS Code Extension**
- ✅ **Any MCP-compatible application**

## 🌟 Features

- **🔧 Universal Compatibility**: One configuration works everywhere
- **📦 Zero OS Dependencies**: Pure Node.js/Python, no platform-specific code
- **🚀 One-Command Setup**: Auto-installs all dependencies
- **🎮 Smart CLI**: Manage MCP servers with simple commands
- **🔄 Hot Reload**: Changes apply instantly
- **📝 Rich Examples**: Pre-configured MCP servers included
- **🛡️ Production Ready**: Error handling, logging, health checks
- **🌐 GitHub Ready**: Clone and run, no configuration needed

## 📁 Project Structure

```
MCP/
├── servers/                    # MCP Server Implementations
│   ├── filesystem-mcp/         # File system operations server
│   ├── web-search-mcp/         # Web search capabilities
│   ├── database-mcp/           # Database operations
│   └── custom-mcp-template/    # Template for new servers
│
├── config/
│   └── mcp.json               # Universal MCP configuration
│
├── launchers/                  # Cross-platform launchers
│   ├── run-all.js             # Universal Node.js launcher
│   ├── run-all.bat            # Windows batch launcher
│   ├── run-all.sh             # Unix shell launcher
│   └── run-all.ps1            # PowerShell launcher
│
├── cli/                       # MCP Management CLI
│   └── mcp-cli.js            # Command-line interface
│
├── scripts/                   # Utility scripts
│   ├── install.js            # Universal installer
│   ├── setup-global.js       # Global path setup
│   └── health-check.js       # System health checker
│
├── docs/                      # Documentation
│   ├── SETUP.md              # Detailed setup guide
│   ├── API.md                # MCP API documentation
│   └── TROUBLESHOOTING.md    # Common issues & solutions
│
└── templates/                 # Server templates
    ├── node-mcp-template/
    └── python-mcp-template/
```

## ⚡ Quick Start

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/MCP.git
cd MCP
```

### 2️⃣ Run Universal Installer

```bash
# Installs all dependencies for all MCP servers
npm run setup
```

Or manually:
```bash
node scripts/install.js
```

### 3️⃣ Start All MCP Servers

#### Option A: Universal (Works Everywhere)
```bash
node launchers/run-all.js
```

#### Option B: Platform-Specific Shortcuts

**Windows (CMD/PowerShell):**
```cmd
launchers\run-all.bat
```

**macOS/Linux:**
```bash
./launchers/run-all.sh
```

### 4️⃣ Connect to Claude

The installer automatically configures Claude. If needed, manually copy:

**Claude Desktop:**
- Windows: `%APPDATA%\Claude\config.json`
- macOS: `~/Library/Application Support/Claude/config.json`
- Linux: `~/.config/claude/config.json`

**VS Code Extension:**
Add to settings.json:
```json
{
  "mcp.configurationFile": "/absolute/path/to/MCP/config/mcp.json"
}
```

## 🎮 CLI Commands

The MCP CLI provides powerful management capabilities:

```bash
# Make CLI globally available
npm link

# List all MCP servers
mcp list

# Start specific server
mcp start filesystem-mcp

# Stop server
mcp stop web-search-mcp

# Add new server
mcp add my-custom-mcp --type node

# Check system health
mcp health

# View logs
mcp logs filesystem-mcp

# Update all servers
mcp update
```

## 📝 Configuration

### `config/mcp.json`

Universal configuration using relative paths:

```json
{
  "mcpServers": {
    "filesystem-mcp": {
      "command": "node",
      "args": ["servers/filesystem-mcp/index.js"],
      "env": {
        "NODE_ENV": "production"
      },
      "autoRestart": true
    },
    "web-search-mcp": {
      "command": "python3",
      "args": ["-m", "servers.web_search_mcp.main"],
      "env": {
        "SEARCH_API_KEY": "${SEARCH_API_KEY}"
      }
    }
  },
  "global": {
    "logLevel": "info",
    "healthCheckInterval": 30000,
    "autoRestartOnFailure": true
  }
}
```

## 🔌 Included MCP Servers

### 1. **Filesystem MCP** (Node.js)
- Read/write files
- Directory operations
- File search & grep
- Path manipulation

### 2. **Web Search MCP** (Python)
- Web search integration
- Content scraping
- API interactions
- Result caching

### 3. **Database MCP** (Node.js)
- SQL operations
- NoSQL support
- Query builder
- Migration tools

### 4. **Custom Template**
- Ready-to-use boilerplate
- Best practices included
- Full TypeScript support

## 🛠️ Development

### Creating a New MCP Server

```bash
# Use the CLI
mcp create my-awesome-mcp --language javascript

# Or copy template manually
cp -r templates/node-mcp-template servers/my-awesome-mcp
```

### Server Template Structure

```javascript
// servers/my-mcp/index.js
const { MCPServer } = require('../../lib/mcp-base');

class MyMCPServer extends MCPServer {
  async initialize() {
    this.registerTool('myTool', this.handleMyTool.bind(this));
  }

  async handleMyTool(params) {
    // Your implementation
    return { success: true, data: 'result' };
  }
}

module.exports = MyMCPServer;
```

## 🌐 Global Installation

Make MCP globally accessible:

```bash
# Run global setup
npm run global-setup

# Now use from anywhere
mcp start    # Works from any directory
```

## 🔍 Environment Variables

Create `.env` file for sensitive data:

```env
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
SEARCH_API_KEY=...

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=mcp_user
DB_PASS=secure_password

# MCP Settings
MCP_PORT=3000
MCP_LOG_LEVEL=debug
```

## 📊 Health Monitoring

Built-in health check system:

```bash
# Check all servers
mcp health

# Output:
✅ filesystem-mcp: Healthy (uptime: 2h 15m)
✅ web-search-mcp: Healthy (uptime: 2h 15m)
⚠️ database-mcp: Starting...
```

## 🐛 Troubleshooting

### Common Issues

**1. Permission Denied (macOS/Linux)**
```bash
chmod +x launchers/run-all.sh
chmod +x scripts/install.js
```

**2. Python/Node Not Found**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python
sudo apt-get update
sudo apt-get install python3 python3-pip
```

**3. Port Already in Use**
```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-mcp`)
3. Commit changes (`git commit -m 'Add amazing MCP server'`)
4. Push to branch (`git push origin feature/amazing-mcp`)
5. Open Pull Request

### Contribution Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure cross-platform compatibility

## 📜 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

- Claude AI team for MCP protocol
- Open source community
- All contributors

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/MCP/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/MCP/discussions)
- **Email**: mcp-support@example.com

## 🚦 Status
#Under Develop.....🙏

---

**Made with ❤️ for the MCP Community**

*Star ⭐ this repo if you find it helpful!*
