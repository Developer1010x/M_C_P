#!/usr/bin/env node

/**
 * Universal MCP Server Launcher
 * Works on Windows, macOS, Linux
 *
 * This launcher manages all MCP servers defined in config/mcp.json
 * Features:
 * - Cross-platform compatibility
 * - Automatic restart on failure
 * - Health monitoring
 * - Graceful shutdown
 * - Color-coded logging
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ANSI color codes for better visibility
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Load configuration
const configPath = path.join(__dirname, '..', 'config', 'mcp.json');
let config;

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error(`${colors.red}❌ Failed to load configuration:${colors.reset}`, error.message);
  process.exit(1);
}

// Server management
const servers = new Map();
const restartCounts = new Map();

class MCPServerManager {
  constructor(name, serverConfig) {
    this.name = name;
    this.config = serverConfig;
    this.process = null;
    this.status = 'stopped';
    this.startTime = null;
    this.restartAttempts = 0;
  }

  start() {
    console.log(`${colors.cyan}🚀 Starting ${this.name}...${colors.reset}`);

    const cwd = this.config.cwd ?
      path.join(__dirname, '..', this.config.cwd) :
      path.join(__dirname, '..');

    // Merge environment variables
    const env = {
      ...process.env,
      ...this.config.env,
      MCP_SERVER_NAME: this.name,
    };

    // Handle Windows-specific command adjustments
    let command = this.config.command;
    let args = [...this.config.args];

    if (os.platform() === 'win32') {
      // On Windows, use .cmd for npm/npx
      if (command === 'npm' || command === 'npx') {
        command = `${command}.cmd`;
      }
      // Convert Python3 to python on Windows
      if (command === 'python3') {
        command = 'python';
      }
    }

    // Spawn the process
    this.process = spawn(command, args, {
      cwd,
      env,
      shell: os.platform() === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.status = 'running';
    this.startTime = Date.now();

    // Handle stdout
    this.process.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        console.log(`${colors.green}[${this.name}]${colors.reset} ${line}`);
      });
    });

    // Handle stderr
    this.process.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        console.error(`${colors.yellow}[${this.name}]${colors.reset} ${line}`);
      });
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      const runtime = this.startTime ?
        Math.floor((Date.now() - this.startTime) / 1000) : 0;

      if (code === 0 || signal === 'SIGTERM' || signal === 'SIGINT') {
        console.log(`${colors.blue}✅ ${this.name} stopped gracefully (runtime: ${runtime}s)${colors.reset}`);
        this.status = 'stopped';
      } else {
        console.error(`${colors.red}❌ ${this.name} crashed with code ${code} (runtime: ${runtime}s)${colors.reset}`);
        this.status = 'crashed';

        // Auto-restart if configured
        if (this.config.autoRestart && this.restartAttempts < (config.global?.maxRestartAttempts || 3)) {
          this.restartAttempts++;
          const delay = config.global?.restartDelay || 5000;
          console.log(`${colors.yellow}🔄 Restarting ${this.name} in ${delay/1000} seconds (attempt ${this.restartAttempts})...${colors.reset}`);
          setTimeout(() => this.start(), delay);
        }
      }
    });

    // Handle process errors
    this.process.on('error', (error) => {
      console.error(`${colors.red}❌ Failed to start ${this.name}:${colors.reset}`, error.message);
      this.status = 'error';

      // Provide helpful error messages
      if (error.code === 'ENOENT') {
        if (command.includes('python')) {
          console.error(`${colors.yellow}💡 Hint: Make sure Python is installed and in your PATH${colors.reset}`);
        } else if (command.includes('node')) {
          console.error(`${colors.yellow}💡 Hint: Make sure Node.js is installed and in your PATH${colors.reset}`);
        }
      }
    });

    console.log(`${colors.green}✅ ${this.name} started successfully${colors.reset}`);
  }

  stop() {
    if (this.process && this.status === 'running') {
      console.log(`${colors.yellow}🛑 Stopping ${this.name}...${colors.reset}`);
      this.process.kill('SIGTERM');
      this.status = 'stopping';
    }
  }

  restart() {
    console.log(`${colors.cyan}🔄 Restarting ${this.name}...${colors.reset}`);
    this.stop();
    setTimeout(() => this.start(), 2000);
  }
}

// Start all servers
function startAllServers() {
  console.log(`${colors.bright}${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║     Universal MCP Server Launcher      ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════╝${colors.reset}`);
  console.log(`${colors.magenta}Platform: ${os.platform()} | Node: ${process.version}${colors.reset}`);
  console.log(`${colors.magenta}Loading ${Object.keys(config.mcpServers).length} MCP servers...${colors.reset}\n`);

  for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
    const manager = new MCPServerManager(name, serverConfig);
    servers.set(name, manager);

    // Stagger server starts to avoid resource contention
    setTimeout(() => {
      manager.start();
    }, servers.size * 500);
  }
}

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n${colors.yellow}📍 Received ${signal}, shutting down gracefully...${colors.reset}`);

  for (const [name, manager] of servers) {
    manager.stop();
  }

  // Give servers time to shut down
  setTimeout(() => {
    console.log(`${colors.green}✅ All servers stopped. Goodbye!${colors.reset}`);
    process.exit(0);
  }, 3000);
}

// Health monitoring
function startHealthMonitoring() {
  const interval = config.global?.healthCheckInterval || 30000;

  setInterval(() => {
    const statusReport = [];
    for (const [name, manager] of servers) {
      const uptime = manager.startTime ?
        Math.floor((Date.now() - manager.startTime) / 1000) : 0;
      statusReport.push(`${name}: ${manager.status} (uptime: ${uptime}s)`);
    }

    if (process.env.MCP_VERBOSE === 'true') {
      console.log(`${colors.blue}📊 Health Check:${colors.reset}`, statusReport.join(', '));
    }
  }, interval);
}

// Command line interface
function showHelp() {
  console.log(`
${colors.bright}Usage:${colors.reset}
  node run-all.js [options]

${colors.bright}Options:${colors.reset}
  --help, -h         Show this help message
  --verbose, -v      Enable verbose logging
  --server <name>    Start only specific server
  --no-restart       Disable auto-restart

${colors.bright}Examples:${colors.reset}
  node run-all.js                    # Start all servers
  node run-all.js --verbose          # Start with verbose logging
  node run-all.js --server web-mcp   # Start only web-mcp server

${colors.bright}Environment Variables:${colors.reset}
  MCP_VERBOSE=true   Enable verbose logging
  MCP_NO_RESTART=true Disable auto-restart
  `);
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (args.includes('--verbose') || args.includes('-v')) {
  process.env.MCP_VERBOSE = 'true';
}

if (args.includes('--no-restart')) {
  // Override auto-restart for all servers
  for (const server of Object.values(config.mcpServers)) {
    server.autoRestart = false;
  }
}

// Handle specific server
const serverIndex = args.indexOf('--server');
if (serverIndex !== -1 && args[serverIndex + 1]) {
  const serverName = args[serverIndex + 1];
  const serverConfig = config.mcpServers[serverName];

  if (!serverConfig) {
    console.error(`${colors.red}❌ Server '${serverName}' not found in configuration${colors.reset}`);
    console.log(`Available servers: ${Object.keys(config.mcpServers).join(', ')}`);
    process.exit(1);
  }

  // Start only the specified server
  config.mcpServers = { [serverName]: serverConfig };
}

// Register signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// Handle Windows-specific signals
if (os.platform() === 'win32') {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('SIGINT', () => {
    process.emit('SIGINT');
  });
}

// Start the servers
startAllServers();
startHealthMonitoring();

// Keep the process alive
process.stdin.resume();