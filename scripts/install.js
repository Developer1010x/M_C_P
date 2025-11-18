#!/usr/bin/env node

/**
 * Universal MCP Installer
 * Automatically installs all dependencies for all MCP servers
 * Works on Windows, macOS, and Linux
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

// ANSI colors for better output
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

class MCPInstaller {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.serversDir = path.join(this.rootDir, 'servers');
    this.errors = [];
    this.warnings = [];
    this.installed = [];
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async checkPrerequisites() {
    this.log('\n📋 Checking prerequisites...', 'cyan');

    const checks = {
      node: await this.checkCommand('node', '--version'),
      npm: await this.checkCommand('npm', '--version'),
      python: await this.checkPython(),
      pip: await this.checkPip(),
      git: await this.checkCommand('git', '--version')
    };

    // Display results
    for (const [tool, result] of Object.entries(checks)) {
      if (result.success) {
        this.log(`  ✅ ${tool}: ${result.version}`, 'green');
      } else {
        if (tool === 'python' || tool === 'pip') {
          this.log(`  ⚠️  ${tool}: Not found (Python MCP servers will not work)`, 'yellow');
          this.warnings.push(`${tool} not found`);
        } else if (tool === 'git') {
          this.log(`  ⚠️  ${tool}: Not found (Optional, but recommended)`, 'yellow');
        } else {
          this.log(`  ❌ ${tool}: Not found (Required)`, 'red');
          this.errors.push(`${tool} is required but not found`);
        }
      }
    }

    return this.errors.length === 0;
  }

  async checkCommand(command, versionFlag) {
    return new Promise((resolve) => {
      const cmd = os.platform() === 'win32' && (command === 'npm' || command === 'npx')
        ? `${command}.cmd`
        : command;

      const proc = spawn(cmd, [versionFlag], {
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
          resolve({
            success: true,
            version: output.trim().replace(/^v/, '')
          });
        } else {
          resolve({ success: false });
        }
      });

      proc.on('error', () => {
        resolve({ success: false });
      });
    });
  }

  async checkPython() {
    // Try python3 first, then python
    let result = await this.checkCommand('python3', '--version');
    if (!result.success) {
      result = await this.checkCommand('python', '--version');
    }
    return result;
  }

  async checkPip() {
    // Try pip3 first, then pip
    let result = await this.checkCommand('pip3', '--version');
    if (!result.success) {
      result = await this.checkCommand('pip', '--version');
    }
    return result;
  }

  async findMCPServers() {
    this.log('\n🔍 Scanning for MCP servers...', 'cyan');

    const servers = [];

    try {
      const entries = await fs.readdir(this.serversDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const serverPath = path.join(this.serversDir, entry.name);
        const serverInfo = {
          name: entry.name,
          path: serverPath,
          type: null,
          dependencies: null
        };

        // Check for Node.js server
        const packageJsonPath = path.join(serverPath, 'package.json');
        try {
          const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
          serverInfo.type = 'node';
          serverInfo.dependencies = packageJson.dependencies || {};
          servers.push(serverInfo);
          this.log(`  📦 Found Node.js server: ${entry.name}`, 'blue');
        } catch (e) {
          // Not a Node.js server
        }

        // Check for Python server
        const requirementsPath = path.join(serverPath, 'requirements.txt');
        try {
          await fs.access(requirementsPath);
          serverInfo.type = 'python';
          serverInfo.dependencies = requirementsPath;
          servers.push(serverInfo);
          this.log(`  🐍 Found Python server: ${entry.name}`, 'blue');
        } catch (e) {
          // Not a Python server
        }

        if (!serverInfo.type) {
          this.log(`  ⚠️  Unknown server type: ${entry.name}`, 'yellow');
        }
      }
    } catch (error) {
      this.log(`  ❌ Error scanning servers: ${error.message}`, 'red');
      this.errors.push(`Failed to scan servers: ${error.message}`);
    }

    this.log(`\nFound ${servers.length} MCP servers`, 'green');
    return servers;
  }

  async installNodeDependencies(server) {
    this.log(`\n📦 Installing Node.js dependencies for ${server.name}...`, 'cyan');

    return new Promise((resolve) => {
      const npm = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
      const proc = spawn(npm, ['install', '--production'], {
        cwd: server.path,
        shell: os.platform() === 'win32',
        stdio: 'inherit'
      });

      proc.on('close', (code) => {
        if (code === 0) {
          this.log(`  ✅ Successfully installed dependencies for ${server.name}`, 'green');
          this.installed.push(server.name);
          resolve(true);
        } else {
          this.log(`  ❌ Failed to install dependencies for ${server.name}`, 'red');
          this.errors.push(`Failed to install Node.js dependencies for ${server.name}`);
          resolve(false);
        }
      });

      proc.on('error', (error) => {
        this.log(`  ❌ Error installing dependencies: ${error.message}`, 'red');
        this.errors.push(`Error installing Node.js dependencies for ${server.name}: ${error.message}`);
        resolve(false);
      });
    });
  }

  async installPythonDependencies(server) {
    this.log(`\n🐍 Installing Python dependencies for ${server.name}...`, 'cyan');

    // Determine pip command
    let pipCmd = 'pip3';
    if (os.platform() === 'win32') {
      pipCmd = 'pip';
    }

    // Check if pip exists
    const pipCheck = await this.checkCommand(pipCmd, '--version');
    if (!pipCheck.success) {
      pipCmd = 'pip';  // Fallback to pip
      const pipCheck2 = await this.checkCommand(pipCmd, '--version');
      if (!pipCheck2.success) {
        this.log(`  ⚠️  Skipping ${server.name}: pip not found`, 'yellow');
        this.warnings.push(`Skipped Python dependencies for ${server.name}: pip not found`);
        return false;
      }
    }

    return new Promise((resolve) => {
      const proc = spawn(pipCmd, ['install', '-r', 'requirements.txt'], {
        cwd: server.path,
        shell: os.platform() === 'win32',
        stdio: 'inherit'
      });

      proc.on('close', (code) => {
        if (code === 0) {
          this.log(`  ✅ Successfully installed dependencies for ${server.name}`, 'green');
          this.installed.push(server.name);
          resolve(true);
        } else {
          this.log(`  ⚠️  Failed to install dependencies for ${server.name}`, 'yellow');
          this.warnings.push(`Failed to install Python dependencies for ${server.name}`);
          resolve(false);
        }
      });

      proc.on('error', (error) => {
        this.log(`  ⚠️  Error installing dependencies: ${error.message}`, 'yellow');
        this.warnings.push(`Error installing Python dependencies for ${server.name}: ${error.message}`);
        resolve(false);
      });
    });
  }

  async installRootDependencies() {
    this.log('\n📦 Installing root dependencies...', 'cyan');

    const packageJsonPath = path.join(this.rootDir, 'package.json');

    try {
      await fs.access(packageJsonPath);

      return new Promise((resolve) => {
        const npm = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
        const proc = spawn(npm, ['install'], {
          cwd: this.rootDir,
          shell: os.platform() === 'win32',
          stdio: 'inherit'
        });

        proc.on('close', (code) => {
          if (code === 0) {
            this.log('  ✅ Successfully installed root dependencies', 'green');
            resolve(true);
          } else {
            this.log('  ⚠️  Failed to install root dependencies', 'yellow');
            this.warnings.push('Failed to install root dependencies');
            resolve(false);
          }
        });

        proc.on('error', (error) => {
          this.log(`  ⚠️  Error: ${error.message}`, 'yellow');
          this.warnings.push(`Error installing root dependencies: ${error.message}`);
          resolve(false);
        });
      });
    } catch (error) {
      this.log('  ℹ️  No root package.json found, skipping', 'blue');
      return true;
    }
  }

  async createEnvFile() {
    this.log('\n📝 Checking environment configuration...', 'cyan');

    const envPath = path.join(this.rootDir, '.env');
    const envExamplePath = path.join(this.rootDir, '.env.example');

    try {
      await fs.access(envPath);
      this.log('  ✅ .env file exists', 'green');
    } catch (error) {
      // .env doesn't exist, create from example or template
      try {
        await fs.access(envExamplePath);
        const content = await fs.readFile(envExamplePath, 'utf8');
        await fs.writeFile(envPath, content);
        this.log('  ✅ Created .env from .env.example', 'green');
      } catch (err) {
        // Create a basic .env file
        const defaultEnv = `# MCP Environment Variables
# Add your API keys and configuration here

# API Keys
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# MCP Configuration
MCP_LOG_LEVEL=info
MCP_PORT=3000

# Database (if using database-mcp)
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=mcp_user
# DB_PASSWORD=secure_password
`;
        await fs.writeFile(envPath, defaultEnv);
        this.log('  ✅ Created default .env file', 'green');
        this.log('  ℹ️  Remember to add your API keys to .env', 'blue');
      }
    }
  }

  async setupGlobalCommand() {
    this.log('\n🌍 Setting up global MCP command...', 'cyan');

    try {
      // Check if npm link would work
      const npm = os.platform() === 'win32' ? 'npm.cmd' : 'npm';

      // Create a simple package.json if it doesn't exist
      const packageJsonPath = path.join(this.rootDir, 'package.json');
      try {
        await fs.access(packageJsonPath);
      } catch (error) {
        const packageJson = {
          name: 'mcp-system',
          version: '1.0.0',
          description: 'Universal MCP System',
          bin: {
            mcp: './cli/mcp-cli.js'
          },
          scripts: {
            setup: 'node scripts/install.js',
            start: 'node launchers/run-all.js',
            'global-setup': 'npm link'
          }
        };
        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
        this.log('  ✅ Created package.json for global command', 'green');
      }

      this.log('  ℹ️  To enable global "mcp" command, run: npm link', 'blue');
      this.log('     This will allow you to use "mcp" from anywhere', 'blue');

    } catch (error) {
      this.log(`  ⚠️  Could not setup global command: ${error.message}`, 'yellow');
      this.warnings.push('Global command setup failed');
    }
  }

  async printSummary() {
    this.log('\n' + '='.repeat(50), 'cyan');
    this.log('                 INSTALLATION SUMMARY', 'bright');
    this.log('='.repeat(50), 'cyan');

    if (this.installed.length > 0) {
      this.log('\n✅ Successfully installed:', 'green');
      this.installed.forEach(name => {
        this.log(`   • ${name}`, 'green');
      });
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠️  Warnings:', 'yellow');
      this.warnings.forEach(warning => {
        this.log(`   • ${warning}`, 'yellow');
      });
    }

    if (this.errors.length > 0) {
      this.log('\n❌ Errors:', 'red');
      this.errors.forEach(error => {
        this.log(`   • ${error}`, 'red');
      });
    }

    this.log('\n' + '='.repeat(50), 'cyan');

    if (this.errors.length === 0) {
      this.log('\n🎉 Installation completed successfully!', 'green');
      this.log('\nNext steps:', 'cyan');
      this.log('  1. Add your API keys to .env file', 'blue');
      this.log('  2. Run "npm link" for global mcp command (optional)', 'blue');
      this.log('  3. Start all servers:', 'blue');
      this.log('     • Windows: launchers\\run-all.bat', 'blue');
      this.log('     • macOS/Linux: ./launchers/run-all.sh', 'blue');
      this.log('     • Universal: node launchers/run-all.js', 'blue');
    } else {
      this.log('\n⚠️  Installation completed with errors', 'yellow');
      this.log('Please fix the errors above and run the installer again', 'yellow');
    }
  }

  async run() {
    this.log('╔════════════════════════════════════════╗', 'cyan');
    this.log('║       Universal MCP Installer          ║', 'cyan');
    this.log('╚════════════════════════════════════════╝', 'cyan');
    this.log(`Platform: ${os.platform()} | Node: ${process.version}`, 'magenta');

    // Check prerequisites
    const prereqOk = await this.checkPrerequisites();
    if (!prereqOk) {
      this.log('\n❌ Missing required prerequisites. Please install them first.', 'red');
      process.exit(1);
    }

    // Find MCP servers
    const servers = await this.findMCPServers();

    // Install root dependencies
    await this.installRootDependencies();

    // Install dependencies for each server
    for (const server of servers) {
      if (server.type === 'node') {
        await this.installNodeDependencies(server);
      } else if (server.type === 'python') {
        await this.installPythonDependencies(server);
      }
    }

    // Setup environment
    await this.createEnvFile();

    // Setup global command
    await this.setupGlobalCommand();

    // Print summary
    await this.printSummary();
  }
}

// Run the installer
if (require.main === module) {
  const installer = new MCPInstaller();
  installer.run().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = MCPInstaller;