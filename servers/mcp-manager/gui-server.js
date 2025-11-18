/**
 * MCP GUI Server
 * Web-based control panel for MCP management
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const portfinder = require('portfinder');
const open = require('open');

class GUIServer {
  constructor(mcpManager) {
    this.mcpManager = mcpManager;
    this.app = express();
    this.server = null;
    this.io = null;
    this.port = null;
    this.clients = new Set();
  }

  async start(preferredPort = 3456) {
    // Find available port
    this.port = await portfinder.getPortPromise({
      port: preferredPort,
      stopPort: preferredPort + 100
    });

    // Setup Express
    this.setupExpress();

    // Setup WebSocket
    this.setupWebSocket();

    // Start server
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.error(`[GUI] Web interface running at http://localhost:${this.port}`);

        // Auto-open in browser if not in headless mode
        if (process.env.MCP_NO_GUI_OPEN !== 'true') {
          setTimeout(() => {
            open(`http://localhost:${this.port}`);
          }, 1000);
        }

        resolve(this.port);
      });
    });
  }

  setupExpress() {
    // Middleware
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));

    // API Routes
    this.setupAPIRoutes();

    // Serve the main HTML
    this.app.get('/', (req, res) => {
      res.send(this.getHTML());
    });
  }

  setupAPIRoutes() {
    // Server management
    this.app.get('/api/servers', async (req, res) => {
      const result = await this.mcpManager.listServers();
      res.json(result);
    });

    this.app.post('/api/servers/:name/start', async (req, res) => {
      const result = await this.mcpManager.startServer({
        name: req.params.name,
        options: req.body
      });
      res.json(result);
    });

    this.app.post('/api/servers/:name/stop', async (req, res) => {
      const result = await this.mcpManager.stopServer({
        name: req.params.name
      });
      res.json(result);
    });

    this.app.post('/api/servers/:name/restart', async (req, res) => {
      const result = await this.mcpManager.restartServer({
        name: req.params.name
      });
      res.json(result);
    });

    this.app.get('/api/servers/:name/status', async (req, res) => {
      const result = await this.mcpManager.getServerStatus({
        name: req.params.name
      });
      res.json(result);
    });

    this.app.get('/api/servers/:name/logs', async (req, res) => {
      const result = await this.mcpManager.getLogs({
        server: req.params.name,
        lines: parseInt(req.query.lines) || 100
      });
      res.json(result);
    });

    // Configuration
    this.app.get('/api/config', async (req, res) => {
      const result = await this.mcpManager.getConfiguration();
      res.json(result);
    });

    this.app.put('/api/config', async (req, res) => {
      const result = await this.mcpManager.updateConfiguration({
        config: req.body
      });
      res.json(result);
    });

    // Claude integration
    this.app.get('/api/claude/detect', async (req, res) => {
      const result = await this.mcpManager.detectClaude();
      res.json(result);
    });

    this.app.post('/api/claude/configure', async (req, res) => {
      const result = await this.mcpManager.configureClaude();
      res.json(result);
    });

    // System info
    this.app.get('/api/system', async (req, res) => {
      const result = await this.mcpManager.getSystemInfo();
      res.json(result);
    });

    this.app.get('/api/health', async (req, res) => {
      const result = await this.mcpManager.checkHealth();
      res.json(result);
    });

    // AI Agents
    this.app.get('/api/agents', async (req, res) => {
      const result = await this.mcpManager.listAIAgents();
      res.json(result);
    });

    this.app.post('/api/agents/:agent/configure', async (req, res) => {
      const result = await this.mcpManager.configureAIAgent({
        agent: req.params.agent,
        config: req.body
      });
      res.json(result);
    });

    // Marketplace
    this.app.get('/api/marketplace/search', async (req, res) => {
      const result = await this.mcpManager.searchMarketplace({
        query: req.query.q || ''
      });
      res.json(result);
    });

    this.app.post('/api/marketplace/install', async (req, res) => {
      const result = await this.mcpManager.installFromMarketplace({
        packageName: req.body.package
      });
      res.json(result);
    });
  }

  setupWebSocket() {
    this.server = http.createServer(this.app);
    this.io = socketIO(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      console.error('[GUI] Client connected');
      this.clients.add(socket);

      // Send initial state
      this.sendInitialState(socket);

      // Handle client requests
      socket.on('execute-tool', async (data, callback) => {
        try {
          const tool = this.mcpManager.tools.get(data.tool);
          if (tool) {
            const result = await tool.handler(data.params || {});
            callback({ success: true, result });
          } else {
            callback({ success: false, error: 'Tool not found' });
          }
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      socket.on('disconnect', () => {
        console.error('[GUI] Client disconnected');
        this.clients.delete(socket);
      });
    });

    // Broadcast server events
    this.startEventBroadcasting();
  }

  async sendInitialState(socket) {
    const [servers, config, health, claude, agents] = await Promise.all([
      this.mcpManager.listServers(),
      this.mcpManager.getConfiguration(),
      this.mcpManager.checkHealth(),
      this.mcpManager.detectClaude(),
      this.mcpManager.listAIAgents()
    ]);

    socket.emit('initial-state', {
      servers,
      config,
      health,
      claude,
      agents
    });
  }

  startEventBroadcasting() {
    // Broadcast server status changes every 5 seconds
    setInterval(async () => {
      if (this.clients.size > 0) {
        const servers = await this.mcpManager.listServers();
        this.broadcast('servers-update', servers);
      }
    }, 5000);

    // Broadcast health status every 30 seconds
    setInterval(async () => {
      if (this.clients.size > 0) {
        const health = await this.mcpManager.checkHealth();
        this.broadcast('health-update', health);
      }
    }, 30000);
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.error('[GUI] Web interface stopped');
          resolve();
        });
      });
    }
  }

  getHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Manager - Control Panel</title>
    <script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary: #2563eb;
            --primary-dark: #1e40af;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --dark: #1f2937;
            --light: #f3f4f6;
            --border: #e5e7eb;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .header h1 {
            color: var(--dark);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .header .subtitle {
            color: #6b7280;
            margin-top: 5px;
        }

        .status-bar {
            display: flex;
            gap: 20px;
            margin-top: 20px;
        }

        .status-item {
            flex: 1;
            background: var(--light);
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }

        .status-item .label {
            color: #6b7280;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .status-item .value {
            font-size: 24px;
            font-weight: bold;
            margin-top: 5px;
        }

        .main-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .panel {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .panel h2 {
            color: var(--dark);
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--border);
        }

        .server-list {
            list-style: none;
        }

        .server-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            margin-bottom: 10px;
            background: var(--light);
            border-radius: 8px;
            transition: all 0.3s;
        }

        .server-item:hover {
            transform: translateX(5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .server-info {
            flex: 1;
        }

        .server-name {
            font-weight: bold;
            color: var(--dark);
        }

        .server-description {
            color: #6b7280;
            font-size: 14px;
            margin-top: 5px;
        }

        .server-status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .status-running {
            background: #10b98120;
            color: var(--success);
        }

        .status-stopped {
            background: #ef444420;
            color: var(--danger);
        }

        .server-actions {
            display: flex;
            gap: 10px;
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .btn-primary {
            background: var(--primary);
            color: white;
        }

        .btn-success {
            background: var(--success);
            color: white;
        }

        .btn-danger {
            background: var(--danger);
            color: white;
        }

        .btn-warning {
            background: var(--warning);
            color: white;
        }

        .ai-agents {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }

        .agent-card {
            padding: 15px;
            background: var(--light);
            border-radius: 8px;
            text-align: center;
            transition: all 0.3s;
            cursor: pointer;
        }

        .agent-card:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .agent-icon {
            font-size: 32px;
            margin-bottom: 10px;
        }

        .agent-name {
            font-weight: bold;
            color: var(--dark);
        }

        .agent-status {
            font-size: 12px;
            margin-top: 5px;
        }

        .claude-detection {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }

        .claude-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,0.2);
        }

        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid var(--border);
        }

        .tab {
            padding: 10px 20px;
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
        }

        .tab.active {
            color: var(--primary);
        }

        .tab.active::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            right: 0;
            height: 2px;
            background: var(--primary);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .logs {
            background: #1f2937;
            color: #10b981;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            max-height: 400px;
            overflow-y: auto;
        }

        .marketplace-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }

        .marketplace-item {
            padding: 15px;
            background: var(--light);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
        }

        .marketplace-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
        }

        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
        }

        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: var(--success);
            color: white;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            animation: slideIn 0.3s;
            z-index: 2000;
        }

        @keyframes slideIn {
            from {
                transform: translateX(400px);
            }
            to {
                transform: translateX(0);
            }
        }

        @media (max-width: 768px) {
            .main-grid {
                grid-template-columns: 1fr;
            }

            .ai-agents {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                <span>🎮</span>
                MCP Manager Control Panel
            </h1>
            <div class="subtitle">Universal MCP Server Management System v2.0</div>

            <div class="status-bar">
                <div class="status-item">
                    <div class="label">Total Servers</div>
                    <div class="value" id="total-servers">0</div>
                </div>
                <div class="status-item">
                    <div class="label">Running</div>
                    <div class="value" style="color: var(--success)" id="running-servers">0</div>
                </div>
                <div class="status-item">
                    <div class="label">System Health</div>
                    <div class="value" id="system-health">-</div>
                </div>
                <div class="status-item">
                    <div class="label">Claude Status</div>
                    <div class="value" id="claude-status">-</div>
                </div>
            </div>
        </div>

        <div class="main-grid">
            <div class="panel">
                <h2>🚀 MCP Servers</h2>
                <div class="tabs">
                    <button class="tab active" data-tab="servers">Servers</button>
                    <button class="tab" data-tab="logs">Logs</button>
                    <button class="tab" data-tab="config">Config</button>
                </div>

                <div class="tab-content active" id="servers-tab">
                    <ul class="server-list" id="server-list">
                        <!-- Servers will be added dynamically -->
                    </ul>
                    <button class="btn btn-primary" style="width: 100%; margin-top: 20px" onclick="addNewServer()">
                        ➕ Add New Server
                    </button>
                </div>

                <div class="tab-content" id="logs-tab">
                    <div class="logs" id="logs-content">
                        <!-- Logs will appear here -->
                    </div>
                </div>

                <div class="tab-content" id="config-tab">
                    <textarea id="config-editor" style="width: 100%; height: 400px; font-family: monospace">
                        <!-- Config will be loaded here -->
                    </textarea>
                    <button class="btn btn-primary" style="margin-top: 10px" onclick="saveConfig()">
                        💾 Save Configuration
                    </button>
                </div>
            </div>

            <div class="panel">
                <h2>🤖 AI Agents & Integration</h2>

                <div class="ai-agents" id="ai-agents">
                    <div class="agent-card" onclick="configureAgent('claude')">
                        <div class="agent-icon">🧠</div>
                        <div class="agent-name">Claude</div>
                        <div class="agent-status">-</div>
                    </div>
                    <div class="agent-card" onclick="configureAgent('openai')">
                        <div class="agent-icon">🤖</div>
                        <div class="agent-name">OpenAI</div>
                        <div class="agent-status">-</div>
                    </div>
                    <div class="agent-card" onclick="configureAgent('gemini')">
                        <div class="agent-icon">✨</div>
                        <div class="agent-name">Gemini</div>
                        <div class="agent-status">-</div>
                    </div>
                    <div class="agent-card" onclick="configureAgent('llama')">
                        <div class="agent-icon">🦙</div>
                        <div class="agent-name">Llama</div>
                        <div class="agent-status">-</div>
                    </div>
                    <div class="agent-card" onclick="configureAgent('mistral')">
                        <div class="agent-icon">🌊</div>
                        <div class="agent-name">Mistral</div>
                        <div class="agent-status">-</div>
                    </div>
                    <div class="agent-card" onclick="configureAgent('custom')">
                        <div class="agent-icon">⚙️</div>
                        <div class="agent-name">Custom</div>
                        <div class="agent-status">-</div>
                    </div>
                </div>

                <div class="claude-detection" id="claude-detection">
                    <h3>🔍 Claude Integration Status</h3>
                    <div class="claude-item">
                        <span>Claude Desktop</span>
                        <span id="claude-desktop-status">Checking...</span>
                    </div>
                    <div class="claude-item">
                        <span>Claude CLI</span>
                        <span id="claude-cli-status">Checking...</span>
                    </div>
                    <div class="claude-item">
                        <span>VS Code Extension</span>
                        <span id="vscode-status">Checking...</span>
                    </div>
                    <button class="btn" style="background: white; color: var(--primary); margin-top: 15px; width: 100%"
                            onclick="autoConfigureClaude()">
                        🔧 Auto-Configure Claude
                    </button>
                </div>
            </div>
        </div>

        <div class="panel" style="margin-top: 20px">
            <h2>📦 MCP Marketplace</h2>
            <div style="display: flex; gap: 10px; margin-bottom: 20px">
                <input type="text" id="marketplace-search" placeholder="Search MCP servers..."
                       style="flex: 1; padding: 10px; border: 1px solid var(--border); border-radius: 6px">
                <button class="btn btn-primary" onclick="searchMarketplace()">🔍 Search</button>
            </div>
            <div class="marketplace-grid" id="marketplace-grid">
                <!-- Marketplace items will appear here -->
            </div>
        </div>
    </div>

    <!-- Modal for adding servers -->
    <div class="modal" id="add-server-modal">
        <div class="modal-content">
            <h2>Add New MCP Server</h2>
            <form id="add-server-form">
                <div style="margin-bottom: 15px">
                    <label>Server Name:</label>
                    <input type="text" name="name" required style="width: 100%; padding: 8px; margin-top: 5px">
                </div>
                <div style="margin-bottom: 15px">
                    <label>Type:</label>
                    <select name="type" style="width: 100%; padding: 8px; margin-top: 5px">
                        <option value="node">Node.js</option>
                        <option value="python">Python</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div style="margin-bottom: 15px">
                    <label>Description:</label>
                    <textarea name="description" style="width: 100%; padding: 8px; margin-top: 5px"></textarea>
                </div>
                <div style="display: flex; gap: 10px">
                    <button type="submit" class="btn btn-success">Create</button>
                    <button type="button" class="btn btn-danger" onclick="closeModal()">Cancel</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // WebSocket connection
        const socket = io();

        // State
        let servers = [];
        let config = {};
        let claudeStatus = {};

        // Initialize
        socket.on('connect', () => {
            console.log('Connected to MCP Manager');
            showNotification('Connected to MCP Manager', 'success');
        });

        socket.on('initial-state', (data) => {
            updateServers(data.servers);
            updateClaude(data.claude);
            updateHealth(data.health);
            config = data.config;
            updateConfigEditor();
        });

        socket.on('servers-update', (data) => {
            updateServers(data);
        });

        socket.on('health-update', (data) => {
            updateHealth(data);
        });

        // UI Functions
        function updateServers(data) {
            if (!data.success) return;

            servers = data.servers;
            document.getElementById('total-servers').textContent = data.total;
            document.getElementById('running-servers').textContent = data.running;

            const list = document.getElementById('server-list');
            list.innerHTML = servers.map(server => \`
                <li class="server-item">
                    <div class="server-info">
                        <div class="server-name">\${server.name}</div>
                        <div class="server-description">\${server.description || 'No description'}</div>
                    </div>
                    <span class="server-status status-\${server.status}">\${server.status}</span>
                    <div class="server-actions">
                        \${server.status === 'stopped' ?
                            \`<button class="btn btn-success" onclick="startServer('\${server.name}')">▶ Start</button>\` :
                            \`<button class="btn btn-danger" onclick="stopServer('\${server.name}')">⏹ Stop</button>\`
                        }
                        <button class="btn btn-warning" onclick="restartServer('\${server.name}')">🔄</button>
                    </div>
                </li>
            \`).join('');
        }

        function updateClaude(data) {
            if (!data.success) return;

            claudeStatus = data;

            document.getElementById('claude-desktop-status').textContent =
                data.desktop.installed ? '✅ Installed' : '❌ Not found';

            document.getElementById('claude-cli-status').textContent =
                data.cli.installed ? '✅ Installed' : '❌ Not found';

            document.getElementById('vscode-status').textContent =
                data.vsCode.configured ? '✅ Configured' : '❌ Not configured';

            document.getElementById('claude-status').textContent =
                data.summary.anyClaudeFound ? '✅' : '❌';
        }

        function updateHealth(data) {
            if (!data.success) return;

            const healthEl = document.getElementById('system-health');
            healthEl.textContent = data.overall_status === 'healthy' ? '✅' : '⚠️';
            healthEl.style.color = data.overall_status === 'healthy' ? 'var(--success)' : 'var(--warning)';
        }

        function updateConfigEditor() {
            document.getElementById('config-editor').value = JSON.stringify(config.config || {}, null, 2);
        }

        // Server actions
        async function startServer(name) {
            const response = await fetch(\`/api/servers/\${name}/start\`, { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                showNotification(\`Started \${name}\`, 'success');
            } else {
                showNotification(result.error, 'error');
            }
        }

        async function stopServer(name) {
            const response = await fetch(\`/api/servers/\${name}/stop\`, { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                showNotification(\`Stopped \${name}\`, 'success');
            } else {
                showNotification(result.error, 'error');
            }
        }

        async function restartServer(name) {
            const response = await fetch(\`/api/servers/\${name}/restart\`, { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                showNotification(\`Restarted \${name}\`, 'success');
            } else {
                showNotification(result.error, 'error');
            }
        }

        // Claude configuration
        async function autoConfigureClaude() {
            const response = await fetch('/api/claude/configure', { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                showNotification('Claude configured successfully', 'success');
            } else {
                showNotification('Failed to configure Claude', 'error');
            }
        }

        // Modal functions
        function addNewServer() {
            document.getElementById('add-server-modal').style.display = 'block';
        }

        function closeModal() {
            document.getElementById('add-server-modal').style.display = 'none';
        }

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                document.getElementById(tab.dataset.tab + '-tab').classList.add('active');
            });
        });

        // Notifications
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.textContent = message;
            notification.style.background = type === 'success' ? 'var(--success)' :
                                          type === 'error' ? 'var(--danger)' : 'var(--primary)';
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        // Periodically fetch logs
        setInterval(async () => {
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab && activeTab.id === 'logs-tab') {
                const response = await fetch('/api/servers/mcp-manager/logs?lines=50');
                const result = await response.json();
                if (result.success && result.logs[0]) {
                    document.getElementById('logs-content').textContent = result.logs[0].lines.join('\\n');
                }
            }
        }, 5000);
    </script>
</body>
</html>`;
  }
}

module.exports = GUIServer;