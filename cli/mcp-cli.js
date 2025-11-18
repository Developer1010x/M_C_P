#!/usr/bin/env node

/**
 * MCP Command Line Interface
 * Manage MCP servers with simple commands
 *
 * Commands:
 * - mcp list: List all MCP servers
 * - mcp start [server]: Start server(s)
 * - mcp stop [server]: Stop server(s)
 * - mcp restart [server]: Restart server(s)
 * - mcp status: Show server status
 * - mcp health: Check server health
 * - mcp logs [server]: View server logs
 * - mcp add <name>: Add new MCP server
 * - mcp remove <name>: Remove MCP server
 * - mcp config: Edit configuration
 * - mcp install: Install dependencies
 * - mcp update: Update all servers
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const os = require('os');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

class MCPCLI {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.configPath = path.join(this.rootDir, 'config', 'mcp.json');
    this.serversDir = path.join(this.rootDir, 'servers');
    this.launchersDir = path.join(this.rootDir, 'launchers');
    this.runningServers = new Map();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  error(message) {
    console.error(`${colors.red}❌ Error: ${message}${colors.reset}`);
  }

  success(message) {
    console.log(`${colors.green}✅ ${message}${colors.reset}`);
  }

  info(message) {
    console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
  }

  warn(message) {
    console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
  }

  async loadConfig() {
    try {
      const content = await fs.readFile(this.configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      this.error(`Failed to load configuration: ${error.message}`);
      process.exit(1);
    }
  }

  async saveConfig(config) {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      this.success('Configuration saved');
    } catch (error) {
      this.error(`Failed to save configuration: ${error.message}`);
      process.exit(1);
    }
  }

  async listServers() {
    const config = await this.loadConfig();
    const servers = Object.keys(config.mcpServers);

    this.log('\n📦 Available MCP Servers:', 'cyan');
    this.log('─'.repeat(50), 'dim');

    for (const name of servers) {
      const server = config.mcpServers[name];
      const status = this.runningServers.has(name) ? 'running' : 'stopped';
      const statusColor = status === 'running' ? 'green' : 'yellow';

      this.log(`\n  ${name}`, 'bright');
      this.log(`    Status: ${colors[statusColor]}● ${status}${colors.reset}`);
      this.log(`    Command: ${colors.dim}${server.command} ${server.args.join(' ')}${colors.reset}`);
      if (server.description) {
        this.log(`    Description: ${server.description}`);
      }
    }

    this.log('\n' + '─'.repeat(50), 'dim');
    this.log(`Total: ${servers.length} servers\n`);
  }

  async startServer(serverName = null) {
    const config = await this.loadConfig();

    if (serverName && !config.mcpServers[serverName]) {
      this.error(`Server '${serverName}' not found`);
      this.info('Use "mcp list" to see available servers');
      process.exit(1);
    }

    const serversToStart = serverName
      ? { [serverName]: config.mcpServers[serverName] }
      : config.mcpServers;

    for (const [name, serverConfig] of Object.entries(serversToStart)) {
      if (this.runningServers.has(name)) {
        this.warn(`${name} is already running`);
        continue;
      }

      this.info(`Starting ${name}...`);

      const launcher = path.join(this.launchersDir, 'run-all.js');
      const proc = spawn('node', [launcher, '--server', name], {
        detached: true,
        stdio: 'ignore'
      });

      proc.unref();
      this.runningServers.set(name, proc.pid);
      this.success(`${name} started (PID: ${proc.pid})`);
    }
  }

  async stopServer(serverName = null) {
    if (serverName && !this.runningServers.has(serverName)) {
      this.warn(`${serverName} is not running`);
      return;
    }

    const serversToStop = serverName
      ? [[serverName, this.runningServers.get(serverName)]]
      : Array.from(this.runningServers.entries());

    for (const [name, pid] of serversToStop) {
      this.info(`Stopping ${name} (PID: ${pid})...`);

      try {
        process.kill(pid, 'SIGTERM');
        this.runningServers.delete(name);
        this.success(`${name} stopped`);
      } catch (error) {
        this.error(`Failed to stop ${name}: ${error.message}`);
      }
    }
  }

  async restartServer(serverName = null) {
    await this.stopServer(serverName);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.startServer(serverName);
  }

  async showStatus() {
    const config = await this.loadConfig();

    this.log('\n📊 MCP Server Status:', 'cyan');
    this.log('─'.repeat(50), 'dim');

    const table = [];
    for (const name of Object.keys(config.mcpServers)) {
      const running = this.runningServers.has(name);
      const pid = this.runningServers.get(name) || '-';

      table.push({
        name,
        status: running ? 'Running' : 'Stopped',
        pid,
        color: running ? 'green' : 'yellow'
      });
    }

    // Print table
    console.log('\n  Name                 Status      PID');
    console.log('  ' + '─'.repeat(45));
    for (const row of table) {
      const name = row.name.padEnd(20);
      const status = row.status.padEnd(10);
      console.log(`  ${name} ${colors[row.color]}${status}${colors.reset} ${row.pid}`);
    }

    console.log();
  }

  async checkHealth() {
    this.log('\n🏥 Checking MCP System Health:', 'cyan');
    this.log('─'.repeat(50), 'dim');

    // Check Node.js
    const nodeVersion = process.version;
    this.success(`Node.js: ${nodeVersion}`);

    // Check Python
    await this.checkCommand('Python', 'python3', '--version');

    // Check configuration
    try {
      const config = await this.loadConfig();
      this.success(`Configuration: Valid (${Object.keys(config.mcpServers).length} servers)`);
    } catch (error) {
      this.error('Configuration: Invalid');
    }

    // Check servers directory
    try {
      const servers = await fs.readdir(this.serversDir);
      this.success(`Servers directory: ${servers.length} servers found`);
    } catch (error) {
      this.error('Servers directory: Not found');
    }

    // Check running servers
    if (this.runningServers.size > 0) {
      this.success(`Running servers: ${this.runningServers.size}`);
    } else {
      this.info('No servers currently running');
    }

    console.log();
  }

  async checkCommand(name, command, args) {
    return new Promise((resolve) => {
      const proc = spawn(command, [args], {
        shell: os.platform() === 'win32',
        stdio: 'pipe'
      });

      let output = '';
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          this.success(`${name}: ${output.trim()}`);
        } else {
          this.warn(`${name}: Not found`);
        }
        resolve();
      });

      proc.on('error', () => {
        this.warn(`${name}: Not found`);
        resolve();
      });
    });
  }

  async viewLogs(serverName) {
    if (!serverName) {
      this.error('Please specify a server name');
      this.info('Usage: mcp logs <server-name>');
      process.exit(1);
    }

    this.info(`Viewing logs for ${serverName}...`);
    this.info('Press Ctrl+C to exit');

    // In a real implementation, this would tail the actual log files
    // For now, we'll show a message
    this.warn('Log viewing not yet implemented');
    this.info('Logs would be stored in logs/ directory');
  }

  async addServer(name) {
    if (!name) {
      this.error('Please specify a server name');
      this.info('Usage: mcp add <name>');
      process.exit(1);
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => {
      rl.question(prompt, resolve);
    });

    this.log(`\n🆕 Adding new MCP server: ${name}`, 'cyan');

    const type = await question('Server type (node/python): ');
    const description = await question('Description: ');

    rl.close();

    // Create server directory
    const serverDir = path.join(this.serversDir, name);
    await fs.mkdir(serverDir, { recursive: true });

    if (type === 'node' || type === 'nodejs') {
      // Create Node.js server template
      const packageJson = {
        name,
        version: '1.0.0',
        description,
        main: 'index.js',
        scripts: {
          start: 'node index.js'
        }
      };

      await fs.writeFile(
        path.join(serverDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      await fs.writeFile(
        path.join(serverDir, 'index.js'),
        '// MCP Server implementation\nconsole.log("MCP Server started");'
      );

      // Update configuration
      const config = await this.loadConfig();
      config.mcpServers[name] = {
        command: 'node',
        args: [`../servers/${name}/index.js`],
        cwd: 'config',
        description
      };
      await this.saveConfig(config);

    } else if (type === 'python') {
      // Create Python server template
      await fs.writeFile(
        path.join(serverDir, 'requirements.txt'),
        '# Add Python dependencies here\n'
      );

      await fs.writeFile(
        path.join(serverDir, 'main.py'),
        '#!/usr/bin/env python3\n# MCP Server implementation\nprint("MCP Server started")'
      );

      // Update configuration
      const config = await this.loadConfig();
      config.mcpServers[name] = {
        command: 'python3',
        args: [`../servers/${name}/main.py`],
        cwd: 'config',
        description
      };
      await this.saveConfig(config);
    }

    this.success(`Server '${name}' added successfully`);
    this.info(`Server directory: ${serverDir}`);
    this.info('Run "mcp install" to install dependencies');
  }

  async removeServer(name) {
    if (!name) {
      this.error('Please specify a server name');
      this.info('Usage: mcp remove <name>');
      process.exit(1);
    }

    const config = await this.loadConfig();
    if (!config.mcpServers[name]) {
      this.error(`Server '${name}' not found`);
      process.exit(1);
    }

    // Stop server if running
    if (this.runningServers.has(name)) {
      await this.stopServer(name);
    }

    // Remove from configuration
    delete config.mcpServers[name];
    await this.saveConfig(config);

    this.success(`Server '${name}' removed from configuration`);
    this.warn(`Server files in servers/${name}/ were not deleted`);
  }

  async installDependencies() {
    this.info('Running MCP installer...\n');
    const installer = spawn('node', [path.join(this.rootDir, 'scripts', 'install.js')], {
      stdio: 'inherit'
    });

    installer.on('close', (code) => {
      if (code === 0) {
        this.success('Installation completed');
      } else {
        this.error('Installation failed');
      }
    });
  }

  async updateServers() {
    this.info('Updating all MCP servers...');

    // Update Node.js servers
    const npm = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
    const servers = await fs.readdir(this.serversDir, { withFileTypes: true });

    for (const server of servers) {
      if (!server.isDirectory()) continue;

      const serverPath = path.join(this.serversDir, server.name);
      const packageJsonPath = path.join(serverPath, 'package.json');

      try {
        await fs.access(packageJsonPath);
        this.info(`Updating ${server.name}...`);

        await new Promise((resolve) => {
          const proc = spawn(npm, ['update'], {
            cwd: serverPath,
            stdio: 'inherit'
          });
          proc.on('close', resolve);
        });

        this.success(`${server.name} updated`);
      } catch (error) {
        // Not a Node.js server or error
      }
    }

    this.success('All servers updated');
  }

  async showHelp() {
    this.log('\n🚀 MCP Command Line Interface', 'cyan');
    this.log('─'.repeat(50), 'dim');

    const commands = [
      { cmd: 'mcp list', desc: 'List all MCP servers' },
      { cmd: 'mcp start [server]', desc: 'Start server(s)' },
      { cmd: 'mcp stop [server]', desc: 'Stop server(s)' },
      { cmd: 'mcp restart [server]', desc: 'Restart server(s)' },
      { cmd: 'mcp status', desc: 'Show server status' },
      { cmd: 'mcp health', desc: 'Check system health' },
      { cmd: 'mcp logs <server>', desc: 'View server logs' },
      { cmd: 'mcp add <name>', desc: 'Add new MCP server' },
      { cmd: 'mcp remove <name>', desc: 'Remove MCP server' },
      { cmd: 'mcp install', desc: 'Install dependencies' },
      { cmd: 'mcp update', desc: 'Update all servers' },
      { cmd: 'mcp help', desc: 'Show this help message' },
    ];

    console.log('\nCommands:');
    for (const { cmd, desc } of commands) {
      console.log(`  ${colors.bright}${cmd.padEnd(25)}${colors.reset} ${desc}`);
    }

    console.log('\nExamples:');
    console.log(`  ${colors.dim}mcp start              # Start all servers${colors.reset}`);
    console.log(`  ${colors.dim}mcp start web-mcp      # Start specific server${colors.reset}`);
    console.log(`  ${colors.dim}mcp status             # Check server status${colors.reset}`);
    console.log(`  ${colors.dim}mcp add my-custom-mcp  # Add new server${colors.reset}`);

    console.log();
  }

  async run(args) {
    const command = args[0] || 'help';
    const param = args[1];

    switch (command) {
      case 'list':
      case 'ls':
        await this.listServers();
        break;

      case 'start':
        await this.startServer(param);
        break;

      case 'stop':
        await this.stopServer(param);
        break;

      case 'restart':
        await this.restartServer(param);
        break;

      case 'status':
        await this.showStatus();
        break;

      case 'health':
        await this.checkHealth();
        break;

      case 'logs':
      case 'log':
        await this.viewLogs(param);
        break;

      case 'add':
      case 'create':
        await this.addServer(param);
        break;

      case 'remove':
      case 'rm':
      case 'delete':
        await this.removeServer(param);
        break;

      case 'install':
        await this.installDependencies();
        break;

      case 'update':
      case 'upgrade':
        await this.updateServers();
        break;

      case 'help':
      case '--help':
      case '-h':
        await this.showHelp();
        break;

      default:
        this.error(`Unknown command: ${command}`);
        this.info('Use "mcp help" to see available commands');
        process.exit(1);
    }
  }
}

// Run the CLI
if (require.main === module) {
  const cli = new MCPCLI();
  const args = process.argv.slice(2);

  cli.run(args).catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = MCPCLI;