#!/usr/bin/env node

/**
 * MCP Manager Server
 * This IS an MCP server itself that manages other MCP servers
 * Provides tools for AI agents to control MCP ecosystem
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');
const readline = require('readline');

// Import GUI server
const GUIServer = require('./gui-server');
const ClaudeConfigManager = require('./claude-config-manager');
const AIAgentConnector = require('./ai-agent-connector');

class MCPManagerServer {
  constructor() {
    this.serverName = 'mcp-manager';
    this.version = '2.0.0';
    this.rootDir = path.join(__dirname, '..', '..');
    this.configPath = path.join(this.rootDir, 'config', 'mcp.json');
    this.servers = new Map();
    this.guiServer = null;
    this.claudeManager = null;
    this.aiConnector = null;
    this.tools = new Map();
    this.rl = null;
  }

  async initialize() {
    console.error(`[MCP-Manager] Initializing v${this.version}...`);

    // Initialize components
    this.claudeManager = new ClaudeConfigManager(this.rootDir);
    this.aiConnector = new AIAgentConnector();

    // Register all MCP tools
    this.registerTools();

    // Auto-detect and configure Claude
    await this.claudeManager.autoDetectAndConfigure();

    // Start GUI server if requested
    if (process.env.MCP_GUI === 'true' || process.argv.includes('--gui')) {
      this.guiServer = new GUIServer(this);
      await this.guiServer.start();
    }

    // Set up stdin/stdout communication for MCP protocol
    this.setupMCPCommunication();

    // Send initialization response
    this.sendResponse({
      type: 'initialize',
      status: 'success',
      serverName: this.serverName,
      version: this.version,
      capabilities: {
        tools: Array.from(this.tools.keys()),
        gui: this.guiServer ? `http://localhost:${this.guiServer.port}` : null,
        aiAgents: this.aiConnector.getSupportedAgents()
      }
    });
  }

  registerTools() {
    // Server Management Tools
    this.tools.set('listServers', {
      description: 'List all available MCP servers',
      handler: this.listServers.bind(this)
    });

    this.tools.set('startServer', {
      description: 'Start an MCP server',
      parameters: { name: 'string', options: 'object?' },
      handler: this.startServer.bind(this)
    });

    this.tools.set('stopServer', {
      description: 'Stop an MCP server',
      parameters: { name: 'string' },
      handler: this.stopServer.bind(this)
    });

    this.tools.set('restartServer', {
      description: 'Restart an MCP server',
      parameters: { name: 'string' },
      handler: this.restartServer.bind(this)
    });

    this.tools.set('getServerStatus', {
      description: 'Get detailed status of a server',
      parameters: { name: 'string' },
      handler: this.getServerStatus.bind(this)
    });

    // Configuration Tools
    this.tools.set('getConfiguration', {
      description: 'Get current MCP configuration',
      handler: this.getConfiguration.bind(this)
    });

    this.tools.set('updateConfiguration', {
      description: 'Update MCP configuration',
      parameters: { config: 'object' },
      handler: this.updateConfiguration.bind(this)
    });

    this.tools.set('addServer', {
      description: 'Add a new MCP server',
      parameters: { name: 'string', config: 'object' },
      handler: this.addServer.bind(this)
    });

    this.tools.set('removeServer', {
      description: 'Remove an MCP server',
      parameters: { name: 'string' },
      handler: this.removeServer.bind(this)
    });

    // Claude Integration Tools
    this.tools.set('detectClaude', {
      description: 'Detect Claude Desktop and CLI installations',
      handler: this.detectClaude.bind(this)
    });

    this.tools.set('configureClaude', {
      description: 'Auto-configure Claude with MCP servers',
      handler: this.configureClaude.bind(this)
    });

    // System Tools
    this.tools.set('getSystemInfo', {
      description: 'Get system information and health',
      handler: this.getSystemInfo.bind(this)
    });

    this.tools.set('installDependencies', {
      description: 'Install dependencies for a server',
      parameters: { server: 'string' },
      handler: this.installDependencies.bind(this)
    });

    this.tools.set('checkHealth', {
      description: 'Run health checks on all systems',
      handler: this.checkHealth.bind(this)
    });

    this.tools.set('getLogs', {
      description: 'Get logs from MCP servers',
      parameters: { server: 'string?', lines: 'number?' },
      handler: this.getLogs.bind(this)
    });

    // AI Agent Tools
    this.tools.set('listAIAgents', {
      description: 'List supported AI agents and their status',
      handler: this.listAIAgents.bind(this)
    });

    this.tools.set('configureAIAgent', {
      description: 'Configure an AI agent to use MCP',
      parameters: { agent: 'string', config: 'object' },
      handler: this.configureAIAgent.bind(this)
    });

    // GUI Control Tools
    this.tools.set('openGUI', {
      description: 'Open the web GUI in browser',
      handler: this.openGUI.bind(this)
    });

    this.tools.set('getGUIStatus', {
      description: 'Get GUI server status',
      handler: this.getGUIStatus.bind(this)
    });

    // Marketplace Tools
    this.tools.set('searchMCPServers', {
      description: 'Search for MCP servers in the marketplace',
      parameters: { query: 'string' },
      handler: this.searchMarketplace.bind(this)
    });

    this.tools.set('installFromMarketplace', {
      description: 'Install an MCP server from marketplace',
      parameters: { packageName: 'string' },
      handler: this.installFromMarketplace.bind(this)
    });
  }

  // Tool Implementations

  async listServers() {
    try {
      const config = await this.loadConfig();
      const servers = [];

      for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
        const status = this.servers.has(name) ? 'running' : 'stopped';
        servers.push({
          name,
          status,
          description: serverConfig.description,
          type: serverConfig.command === 'python' || serverConfig.command === 'python3' ? 'python' : 'node',
          autoRestart: serverConfig.autoRestart
        });
      }

      return {
        success: true,
        servers,
        total: servers.length,
        running: servers.filter(s => s.status === 'running').length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async startServer({ name, options = {} }) {
    try {
      const config = await this.loadConfig();
      const serverConfig = config.mcpServers[name];

      if (!serverConfig) {
        throw new Error(`Server '${name}' not found`);
      }

      if (this.servers.has(name)) {
        return {
          success: false,
          error: `Server '${name}' is already running`
        };
      }

      // Start the server
      const cwd = serverConfig.cwd ?
        path.join(this.rootDir, serverConfig.cwd) :
        this.rootDir;

      const env = {
        ...process.env,
        ...serverConfig.env,
        ...options.env
      };

      const proc = spawn(serverConfig.command, serverConfig.args, {
        cwd,
        env,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.servers.set(name, {
        process: proc,
        startTime: Date.now(),
        config: serverConfig
      });

      // Handle process events
      proc.stdout.on('data', (data) => {
        console.error(`[${name}] ${data.toString()}`);
      });

      proc.stderr.on('data', (data) => {
        console.error(`[${name}:ERROR] ${data.toString()}`);
      });

      proc.on('exit', (code) => {
        console.error(`[${name}] Exited with code ${code}`);
        this.servers.delete(name);

        // Auto-restart if configured
        if (serverConfig.autoRestart && code !== 0) {
          setTimeout(() => {
            this.startServer({ name });
          }, 5000);
        }
      });

      return {
        success: true,
        message: `Server '${name}' started`,
        pid: proc.pid
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async stopServer({ name }) {
    try {
      const server = this.servers.get(name);

      if (!server) {
        return {
          success: false,
          error: `Server '${name}' is not running`
        };
      }

      server.process.kill('SIGTERM');
      this.servers.delete(name);

      return {
        success: true,
        message: `Server '${name}' stopped`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async restartServer({ name }) {
    await this.stopServer({ name });
    await new Promise(resolve => setTimeout(resolve, 2000));
    return await this.startServer({ name });
  }

  async getServerStatus({ name }) {
    try {
      const config = await this.loadConfig();
      const serverConfig = config.mcpServers[name];

      if (!serverConfig) {
        throw new Error(`Server '${name}' not found`);
      }

      const running = this.servers.has(name);
      const server = this.servers.get(name);

      return {
        success: true,
        name,
        status: running ? 'running' : 'stopped',
        config: serverConfig,
        runtime: running ? {
          pid: server.process.pid,
          uptime: Date.now() - server.startTime,
          startTime: new Date(server.startTime).toISOString()
        } : null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getConfiguration() {
    try {
      const config = await this.loadConfig();
      return {
        success: true,
        config
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateConfiguration({ config }) {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      return {
        success: true,
        message: 'Configuration updated'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async addServer({ name, config }) {
    try {
      const currentConfig = await this.loadConfig();

      if (currentConfig.mcpServers[name]) {
        throw new Error(`Server '${name}' already exists`);
      }

      currentConfig.mcpServers[name] = config;
      await this.updateConfiguration({ config: currentConfig });

      // Create server directory if needed
      const serverDir = path.join(this.rootDir, 'servers', name);
      await fs.mkdir(serverDir, { recursive: true });

      return {
        success: true,
        message: `Server '${name}' added`,
        path: serverDir
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async removeServer({ name }) {
    try {
      // Stop server if running
      if (this.servers.has(name)) {
        await this.stopServer({ name });
      }

      const config = await this.loadConfig();
      delete config.mcpServers[name];
      await this.updateConfiguration({ config });

      return {
        success: true,
        message: `Server '${name}' removed`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async detectClaude() {
    return await this.claudeManager.detectClaude();
  }

  async configureClaude() {
    return await this.claudeManager.configureClaude();
  }

  async getSystemInfo() {
    try {
      const si = require('systeminformation');

      const [cpu, mem, disk, network, osInfo] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.fsSize(),
        si.networkInterfaces(),
        si.osInfo()
      ]);

      return {
        success: true,
        system: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          release: osInfo.release,
          arch: osInfo.arch,
          hostname: osInfo.hostname
        },
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          cores: cpu.cores,
          speed: cpu.speed
        },
        memory: {
          total: mem.total,
          free: mem.free,
          used: mem.used,
          percentage: Math.round((mem.used / mem.total) * 100)
        },
        disk: disk.map(d => ({
          fs: d.fs,
          size: d.size,
          used: d.used,
          available: d.available,
          percentage: d.use
        })),
        network: network.map(n => ({
          iface: n.iface,
          ip4: n.ip4,
          ip6: n.ip6,
          mac: n.mac
        })),
        node: {
          version: process.version,
          npm: await this.getNpmVersion()
        },
        python: await this.getPythonVersion()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async installDependencies({ server }) {
    try {
      const serverPath = path.join(this.rootDir, 'servers', server);

      // Check for Node.js dependencies
      const packageJsonPath = path.join(serverPath, 'package.json');
      if (await this.fileExists(packageJsonPath)) {
        await execAsync('npm install', { cwd: serverPath });
      }

      // Check for Python dependencies
      const requirementsPath = path.join(serverPath, 'requirements.txt');
      if (await this.fileExists(requirementsPath)) {
        const pythonCmd = os.platform() === 'win32' ? 'pip' : 'pip3';
        await execAsync(`${pythonCmd} install -r requirements.txt`, { cwd: serverPath });
      }

      return {
        success: true,
        message: `Dependencies installed for '${server}'`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async checkHealth() {
    const health = {
      servers: {},
      system: {},
      claude: {},
      ai_agents: {}
    };

    // Check servers
    const servers = await this.listServers();
    health.servers = servers;

    // Check system
    const systemInfo = await this.getSystemInfo();
    health.system = {
      healthy: systemInfo.success,
      memory_ok: systemInfo.success && systemInfo.memory.percentage < 90,
      disk_ok: systemInfo.success && systemInfo.disk.every(d => d.percentage < 90)
    };

    // Check Claude
    const claudeStatus = await this.detectClaude();
    health.claude = claudeStatus;

    // Check AI agents
    const aiAgents = await this.listAIAgents();
    health.ai_agents = aiAgents;

    return {
      success: true,
      health,
      overall_status: health.system.healthy ? 'healthy' : 'unhealthy'
    };
  }

  async getLogs({ server = null, lines = 100 }) {
    try {
      const logDir = path.join(this.rootDir, 'logs');
      const logs = [];

      if (server) {
        const logFile = path.join(logDir, `${server}.log`);
        if (await this.fileExists(logFile)) {
          const content = await fs.readFile(logFile, 'utf8');
          const logLines = content.split('\n').slice(-lines);
          logs.push({
            server,
            lines: logLines
          });
        }
      } else {
        // Get logs from all servers
        const files = await fs.readdir(logDir);
        for (const file of files) {
          if (file.endsWith('.log')) {
            const content = await fs.readFile(path.join(logDir, file), 'utf8');
            const logLines = content.split('\n').slice(-lines);
            logs.push({
              server: file.replace('.log', ''),
              lines: logLines
            });
          }
        }
      }

      return {
        success: true,
        logs
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async listAIAgents() {
    return await this.aiConnector.listAgents();
  }

  async configureAIAgent({ agent, config }) {
    return await this.aiConnector.configureAgent(agent, config);
  }

  async openGUI() {
    try {
      if (!this.guiServer) {
        this.guiServer = new GUIServer(this);
        await this.guiServer.start();
      }

      const open = require('open');
      await open(`http://localhost:${this.guiServer.port}`);

      return {
        success: true,
        url: `http://localhost:${this.guiServer.port}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getGUIStatus() {
    return {
      success: true,
      running: this.guiServer !== null,
      url: this.guiServer ? `http://localhost:${this.guiServer.port}` : null
    };
  }

  async searchMarketplace({ query }) {
    try {
      // This would connect to a real MCP marketplace/registry
      // For now, return mock data
      return {
        success: true,
        results: [
          {
            name: 'github-mcp',
            description: 'GitHub integration for MCP',
            author: 'mcp-community',
            stars: 245,
            downloads: 1523
          },
          {
            name: 'slack-mcp',
            description: 'Slack messaging MCP server',
            author: 'mcp-community',
            stars: 189,
            downloads: 892
          }
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async installFromMarketplace({ packageName }) {
    try {
      // This would install from a real marketplace
      // For now, simulate installation
      await execAsync(`npm install ${packageName}`, {
        cwd: path.join(this.rootDir, 'servers')
      });

      return {
        success: true,
        message: `Installed ${packageName} from marketplace`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper Methods

  async loadConfig() {
    const content = await fs.readFile(this.configPath, 'utf8');
    return JSON.parse(content);
  }

  async fileExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async getNpmVersion() {
    try {
      const { stdout } = await execAsync('npm --version');
      return stdout.trim();
    } catch {
      return null;
    }
  }

  async getPythonVersion() {
    try {
      const commands = ['python3 --version', 'python --version'];
      for (const cmd of commands) {
        try {
          const { stdout } = await execAsync(cmd);
          return stdout.trim();
        } catch {
          continue;
        }
      }
    } catch {
      return null;
    }
  }

  // MCP Protocol Communication

  setupMCPCommunication() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    this.rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line);
        await this.handleMCPRequest(request);
      } catch (error) {
        this.sendError(error);
      }
    });

    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  async handleMCPRequest(request) {
    console.error(`[MCP-Manager] Handling request: ${request.type}`);

    if (request.type === 'tool' && request.tool) {
      const tool = this.tools.get(request.tool);

      if (!tool) {
        this.sendError(new Error(`Unknown tool: ${request.tool}`));
        return;
      }

      try {
        const result = await tool.handler(request.params || {});
        this.sendResponse({
          type: 'tool_response',
          requestId: request.id,
          result
        });
      } catch (error) {
        this.sendError(error, request.id);
      }
    } else if (request.type === 'list_tools') {
      const toolList = Array.from(this.tools.entries()).map(([name, tool]) => ({
        name,
        description: tool.description,
        parameters: tool.parameters
      }));

      this.sendResponse({
        type: 'tools_list',
        requestId: request.id,
        tools: toolList
      });
    } else if (request.type === 'ping') {
      this.sendResponse({
        type: 'pong',
        requestId: request.id
      });
    }
  }

  sendResponse(response) {
    console.log(JSON.stringify(response));
  }

  sendError(error, requestId = null) {
    this.sendResponse({
      type: 'error',
      requestId,
      error: {
        message: error.message,
        code: error.code || 'INTERNAL_ERROR'
      }
    });
  }

  async shutdown() {
    console.error('[MCP-Manager] Shutting down...');

    // Stop all servers
    for (const [name, server] of this.servers) {
      server.process.kill('SIGTERM');
    }

    // Stop GUI server
    if (this.guiServer) {
      await this.guiServer.stop();
    }

    // Close readline
    if (this.rl) {
      this.rl.close();
    }

    process.exit(0);
  }
}

// Start the server
if (require.main === module) {
  const server = new MCPManagerServer();
  server.initialize().catch(error => {
    console.error('[MCP-Manager] Fatal error:', error);
    process.exit(1);
  });
}

module.exports = MCPManagerServer;