# 🎮 MCP Manager - Universal Control Center

## Overview

MCP Manager is a comprehensive management system that serves as both:
1. **An MCP server itself** - Can be used by Claude and other AI agents
2. **A control center** - Manages all other MCP servers
3. **A GUI interface** - Web-based dashboard for visual management
4. **An AI connector** - Bridges MCP with all major LLM providers

## Features

### 🚀 Core Features

- **Universal MCP Server Management**
  - Start/stop/restart any MCP server
  - Monitor server health and status
  - View real-time logs
  - Configure server settings

- **Claude Auto-Configuration**
  - Automatically detects Claude Desktop and CLI
  - Configures claude_desktop_config.json
  - Updates VS Code extension settings
  - Zero manual configuration required

- **Web GUI Dashboard**
  - Beautiful, responsive interface
  - Real-time server monitoring
  - One-click server control
  - Visual configuration editor

- **AI Agent Support**
  - OpenAI GPT integration
  - Google Gemini support
  - Meta Llama compatibility
  - Mistral AI connection
  - AWS Bedrock integration
  - Azure OpenAI support
  - Custom LLM support

## Installation

### Automatic Setup

The MCP Manager is automatically included when you run the setup script:

```bash
# Unix/macOS/Linux
./setup.sh

# Windows
setup.bat
```

### Manual Installation

```bash
cd MCP/servers/mcp-manager
npm install
```

## Usage

### As an MCP Server (Used by Claude)

MCP Manager exposes the following tools to AI agents:

#### Server Management Tools
- `listServers` - List all available MCP servers
- `startServer` - Start an MCP server
- `stopServer` - Stop an MCP server
- `restartServer` - Restart an MCP server
- `getServerStatus` - Get detailed server status

#### Configuration Tools
- `getConfiguration` - Get MCP configuration
- `updateConfiguration` - Update MCP configuration
- `addServer` - Add a new MCP server
- `removeServer` - Remove an MCP server

#### System Tools
- `getSystemInfo` - Get system information
- `checkHealth` - Run health checks
- `getLogs` - Get server logs
- `installDependencies` - Install server dependencies

#### Claude Integration Tools
- `detectClaude` - Detect Claude installations
- `configureClaude` - Auto-configure Claude

#### AI Agent Tools
- `listAIAgents` - List supported AI agents
- `configureAIAgent` - Configure an AI agent

### Example Claude Prompts

```
"List all MCP servers and their status"
"Start the filesystem-mcp server"
"Check if Claude Desktop is installed and configure it"
"Show me the system health status"
"Configure OpenAI to use MCP tools"
```

### Web GUI Access

#### Automatic Launch
The GUI automatically opens when MCP Manager starts:

```bash
node launchers/run-all.js
# GUI opens at http://localhost:3456
```

#### Manual Access
```bash
# Start just the GUI
node servers/mcp-manager/gui-server.js

# Or use the MCP tool
mcp open-gui
```

#### GUI Features

1. **Dashboard**
   - Server status overview
   - System health metrics
   - Claude detection status
   - Quick actions

2. **Server Management**
   - Start/stop/restart servers
   - View real-time logs
   - Edit configurations
   - Add/remove servers

3. **AI Agent Configuration**
   - One-click setup for each AI provider
   - API key management
   - Custom agent configuration

4. **Marketplace**
   - Search for MCP servers
   - One-click installation
   - Community contributions

## AI Agent Configuration

### OpenAI GPT

```javascript
// Automatic configuration
await mcpManager.configureAIAgent({
  agent: 'openai',
  config: {
    apiKey: 'sk-...',
    model: 'gpt-4',
    mcpServers: config.mcpServers
  }
});
```

Generated files:
- `~/.openai/config.json` - OpenAI configuration
- `~/.openai/mcp_wrapper.py` - Python wrapper for MCP

### Google Gemini

```javascript
await mcpManager.configureAIAgent({
  agent: 'gemini',
  config: {
    apiKey: 'AI...',
    projectId: 'my-project',
    mcpServers: config.mcpServers
  }
});
```

### Meta Llama (Ollama)

```javascript
await mcpManager.configureAIAgent({
  agent: 'llama',
  config: {
    model: 'llama2',
    host: 'http://localhost:11434',
    mcpServers: config.mcpServers
  }
});
```

### LangChain Integration

```javascript
await mcpManager.configureAIAgent({
  agent: 'langchain',
  config: {
    llm: 'openai',
    llmConfig: { temperature: 0.7 },
    mcpServers: config.mcpServers
  }
});
```

Generated files:
- `~/.langchain/mcp_langchain.py` - Python integration
- `~/.langchain/mcp_langchain.js` - JavaScript integration

### Custom LLM

```javascript
await mcpManager.configureAIAgent({
  agent: 'custom',
  config: {
    name: 'My Custom LLM',
    endpoint: 'https://api.example.com/v1/chat',
    apiKey: 'custom-key',
    mcpServers: config.mcpServers
  }
});
```

## API Reference

### REST API Endpoints

```
GET  /api/servers              - List all servers
POST /api/servers/:name/start  - Start a server
POST /api/servers/:name/stop   - Stop a server
POST /api/servers/:name/restart - Restart a server
GET  /api/servers/:name/status - Get server status
GET  /api/servers/:name/logs  - Get server logs

GET  /api/config              - Get configuration
PUT  /api/config              - Update configuration

GET  /api/claude/detect       - Detect Claude installations
POST /api/claude/configure    - Configure Claude

GET  /api/system              - Get system info
GET  /api/health              - Get health status

GET  /api/agents              - List AI agents
POST /api/agents/:agent/configure - Configure an agent

GET  /api/marketplace/search  - Search marketplace
POST /api/marketplace/install - Install from marketplace
```

### WebSocket Events

```javascript
// Connect to WebSocket
const socket = io('http://localhost:3456');

// Listen for events
socket.on('initial-state', (data) => {
  // Initial server state
});

socket.on('servers-update', (data) => {
  // Server status updates
});

socket.on('health-update', (data) => {
  // Health status updates
});

// Execute tools
socket.emit('execute-tool', {
  tool: 'startServer',
  params: { name: 'filesystem-mcp' }
}, (response) => {
  console.log(response);
});
```

## Configuration

### Environment Variables

```env
# GUI Settings
MCP_GUI=true              # Enable GUI on startup
MCP_GUI_PORT=3456        # GUI port
MCP_NO_GUI_OPEN=true     # Don't auto-open browser

# Claude Auto-Detection
MCP_AUTO_CLAUDE=true     # Auto-configure Claude on startup

# Logging
MCP_MANAGER_DEBUG=true   # Enable debug logging
```

### Config File

The MCP Manager is configured in `config/mcp.json`:

```json
{
  "mcpServers": {
    "mcp-manager": {
      "command": "node",
      "args": ["../servers/mcp-manager/index.js"],
      "env": {
        "MCP_GUI": "true"
      },
      "description": "MCP Manager - Control center"
    }
  }
}
```

## Development

### Adding New AI Agents

1. Edit `ai-agent-connector.js`
2. Add agent to `initializeAgents()`
3. Implement configuration method
4. Add tool conversion if needed

Example:
```javascript
['my-llm', {
  name: 'My LLM',
  type: 'custom',
  configFormat: 'custom',
  supported: true,
  configPaths: this.getMyLLMPaths(),
  documentation: 'https://myllm.com/docs',
  features: ['custom-feature']
}]
```

### Creating Custom Tools

Add tools to `index.js`:

```javascript
this.tools.set('myTool', {
  description: 'My custom tool',
  parameters: { param1: 'string' },
  handler: async ({ param1 }) => {
    // Tool implementation
    return { success: true, result: 'Done' };
  }
});
```

### Extending the GUI

Edit `gui-server.js` to add new pages or features:

```javascript
// Add new API endpoint
this.app.get('/api/my-feature', async (req, res) => {
  const result = await this.myFeature();
  res.json(result);
});

// Add to HTML template
// Edit getHTML() method
```

## Troubleshooting

### GUI Won't Open

```bash
# Check if port is in use
lsof -i :3456  # macOS/Linux
netstat -ano | findstr :3456  # Windows

# Use different port
MCP_GUI_PORT=4000 node servers/mcp-manager/index.js
```

### Claude Not Detected

```bash
# Run detection manually
node -e "
const Manager = require('./servers/mcp-manager/claude-config-manager');
const m = new Manager('.');
m.detectClaude().then(console.log);
"
```

### AI Agent Configuration Failed

1. Check API keys in `.env`
2. Verify agent is installed
3. Check configuration paths
4. Review logs for errors

## Security

### API Key Management

- Store API keys in `.env` file
- Never commit `.env` to git
- Use environment variables
- Rotate keys regularly

### Access Control

The GUI runs locally by default. For remote access:

1. Use SSH tunneling
2. Set up HTTPS with certificates
3. Implement authentication
4. Use a reverse proxy

## Best Practices

1. **Always use MCP Manager as the control center**
   - Centralizes management
   - Provides consistent interface
   - Handles auto-configuration

2. **Configure Claude automatically**
   - Let MCP Manager handle configuration
   - Don't edit config files manually
   - Use the GUI for visual management

3. **Monitor health regularly**
   - Check the dashboard
   - Review logs for errors
   - Set up alerts if needed

4. **Keep servers updated**
   - Use marketplace for updates
   - Run dependency installation
   - Check for new versions

## Support

- GitHub Issues: [Report bugs](https://github.com/yourusername/MCP/issues)
- Documentation: [Full docs](../README.md)
- Community: [Discord/Forum]

---

**MCP Manager - The Universal Control Center for MCP and AI Agents** 🚀