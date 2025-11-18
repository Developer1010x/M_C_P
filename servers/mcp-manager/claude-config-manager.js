/**
 * Claude Configuration Manager
 * Auto-detects and configures Claude Desktop and CLI
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ClaudeConfigManager {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.configPath = path.join(rootDir, 'config', 'mcp.json');
    this.claudePaths = this.getClaudePaths();
  }

  getClaudePaths() {
    const platform = os.platform();
    const homeDir = os.homedir();

    const paths = {
      desktop: {},
      cli: {}
    };

    switch (platform) {
      case 'darwin': // macOS
        paths.desktop = {
          app: '/Applications/Claude.app',
          config: path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
          configDir: path.join(homeDir, 'Library', 'Application Support', 'Claude')
        };
        paths.cli = {
          config: path.join(homeDir, '.config', 'claude', 'config.json'),
          configDir: path.join(homeDir, '.config', 'claude')
        };
        break;

      case 'win32': // Windows
        paths.desktop = {
          app: path.join(process.env.LOCALAPPDATA || '', 'Programs', 'claude-desktop', 'Claude.exe'),
          config: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
          configDir: path.join(process.env.APPDATA || '', 'Claude')
        };
        paths.cli = {
          config: path.join(process.env.APPDATA || '', 'claude-cli', 'config.json'),
          configDir: path.join(process.env.APPDATA || '', 'claude-cli')
        };
        break;

      case 'linux':
        paths.desktop = {
          app: '/opt/Claude/claude-desktop',
          config: path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json'),
          configDir: path.join(homeDir, '.config', 'Claude')
        };
        paths.cli = {
          config: path.join(homeDir, '.config', 'claude', 'config.json'),
          configDir: path.join(homeDir, '.config', 'claude')
        };
        break;
    }

    // Add alternative paths
    paths.alternatives = [
      path.join(homeDir, '.claude', 'config.json'),
      path.join(homeDir, '.mcp', 'claude.json'),
      path.join(homeDir, 'claude-config.json')
    ];

    return paths;
  }

  async detectClaude() {
    const result = {
      desktop: {
        installed: false,
        configured: false,
        path: null,
        configPath: null
      },
      cli: {
        installed: false,
        configured: false,
        configPath: null
      },
      vsCode: {
        installed: false,
        configured: false,
        configPath: null
      }
    };

    // Check Claude Desktop
    try {
      // Check if app exists
      if (await this.fileExists(this.claudePaths.desktop.app)) {
        result.desktop.installed = true;
        result.desktop.path = this.claudePaths.desktop.app;
      }

      // Check if config exists
      if (await this.fileExists(this.claudePaths.desktop.config)) {
        result.desktop.configured = true;
        result.desktop.configPath = this.claudePaths.desktop.config;

        // Check if our MCP servers are in the config
        const config = await this.readJSON(this.claudePaths.desktop.config);
        result.desktop.hasMCPServers = config.mcpServers && Object.keys(config.mcpServers).length > 0;
      }
    } catch (error) {
      console.error('Error detecting Claude Desktop:', error);
    }

    // Check Claude CLI
    try {
      // Check if claude command exists
      const { execSync } = require('child_process');
      try {
        execSync('claude --version', { stdio: 'ignore' });
        result.cli.installed = true;
      } catch {
        // Command not found
      }

      // Check CLI config
      if (await this.fileExists(this.claudePaths.cli.config)) {
        result.cli.configured = true;
        result.cli.configPath = this.claudePaths.cli.config;

        const config = await this.readJSON(this.claudePaths.cli.config);
        result.cli.hasMCPServers = config.mcpServers && Object.keys(config.mcpServers).length > 0;
      }
    } catch (error) {
      console.error('Error detecting Claude CLI:', error);
    }

    // Check VS Code extension
    try {
      const vscodeConfigPaths = this.getVSCodeConfigPaths();
      for (const configPath of vscodeConfigPaths) {
        if (await this.fileExists(configPath)) {
          const config = await this.readJSON(configPath);
          if (config['mcp.configurationFile'] || config['claude.mcpServers']) {
            result.vsCode.installed = true;
            result.vsCode.configured = true;
            result.vsCode.configPath = configPath;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error detecting VS Code:', error);
    }

    return {
      success: true,
      ...result,
      summary: {
        claudeDesktopReady: result.desktop.installed,
        claudeCLIReady: result.cli.installed,
        vsCodeReady: result.vsCode.configured,
        anyClaudeFound: result.desktop.installed || result.cli.installed || result.vsCode.configured
      }
    };
  }

  async configureClaude() {
    const detection = await this.detectClaude();
    const results = [];

    // Load our MCP configuration
    const mcpConfig = await this.readJSON(this.configPath);

    // Configure Claude Desktop
    if (detection.desktop.installed) {
      try {
        const configured = await this.configureClaudeDesktop(mcpConfig);
        results.push({
          target: 'Claude Desktop',
          success: configured,
          path: this.claudePaths.desktop.config
        });
      } catch (error) {
        results.push({
          target: 'Claude Desktop',
          success: false,
          error: error.message
        });
      }
    }

    // Configure Claude CLI
    if (detection.cli.installed || detection.cli.configPath) {
      try {
        const configured = await this.configureClaudeCLI(mcpConfig);
        results.push({
          target: 'Claude CLI',
          success: configured,
          path: this.claudePaths.cli.config
        });
      } catch (error) {
        results.push({
          target: 'Claude CLI',
          success: false,
          error: error.message
        });
      }
    }

    // Configure VS Code
    if (detection.vsCode.installed) {
      try {
        const configured = await this.configureVSCode(mcpConfig);
        results.push({
          target: 'VS Code',
          success: configured,
          path: detection.vsCode.configPath
        });
      } catch (error) {
        results.push({
          target: 'VS Code',
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: results.some(r => r.success),
      configured: results,
      message: `Configured ${results.filter(r => r.success).length}/${results.length} Claude installations`
    };
  }

  async configureClaudeDesktop(mcpConfig) {
    // Ensure config directory exists
    await fs.mkdir(this.claudePaths.desktop.configDir, { recursive: true });

    // Read existing config or create new
    let config = {};
    if (await this.fileExists(this.claudePaths.desktop.config)) {
      config = await this.readJSON(this.claudePaths.desktop.config);
    }

    // Convert our MCP config to Claude Desktop format
    const claudeServers = {};
    for (const [name, serverConfig] of Object.entries(mcpConfig.mcpServers)) {
      claudeServers[name] = {
        command: serverConfig.command,
        args: this.resolvePathsForClaude(serverConfig.args),
        env: serverConfig.env || {},
        cwd: serverConfig.cwd ? path.resolve(this.rootDir, serverConfig.cwd) : this.rootDir
      };
    }

    // Merge with existing config
    config.mcpServers = {
      ...config.mcpServers,
      ...claudeServers
    };

    // Add our MCP Manager server
    config.mcpServers['mcp-manager'] = {
      command: 'node',
      args: [path.join(this.rootDir, 'servers', 'mcp-manager', 'index.js')],
      env: {
        MCP_GUI: 'true'
      }
    };

    // Write updated config
    await fs.writeFile(
      this.claudePaths.desktop.config,
      JSON.stringify(config, null, 2)
    );

    return true;
  }

  async configureClaudeCLI(mcpConfig) {
    // Ensure config directory exists
    await fs.mkdir(this.claudePaths.cli.configDir, { recursive: true });

    // Read existing config or create new
    let config = {};
    if (await this.fileExists(this.claudePaths.cli.config)) {
      config = await this.readJSON(this.claudePaths.cli.config);
    }

    // Convert our MCP config to Claude CLI format
    const claudeServers = {};
    for (const [name, serverConfig] of Object.entries(mcpConfig.mcpServers)) {
      claudeServers[name] = {
        command: serverConfig.command,
        args: this.resolvePathsForClaude(serverConfig.args),
        env: serverConfig.env || {}
      };
    }

    // Update config
    config.mcpServers = {
      ...config.mcpServers,
      ...claudeServers
    };

    // Add MCP Manager
    config.mcpServers['mcp-manager'] = {
      command: 'node',
      args: [path.join(this.rootDir, 'servers', 'mcp-manager', 'index.js')]
    };

    // Write updated config
    await fs.writeFile(
      this.claudePaths.cli.config,
      JSON.stringify(config, null, 2)
    );

    return true;
  }

  async configureVSCode(mcpConfig) {
    const vscodeConfigPaths = this.getVSCodeConfigPaths();

    for (const configPath of vscodeConfigPaths) {
      const configDir = path.dirname(configPath);
      await fs.mkdir(configDir, { recursive: true });

      let settings = {};
      if (await this.fileExists(configPath)) {
        const content = await fs.readFile(configPath, 'utf8');
        try {
          settings = JSON.parse(content);
        } catch {
          // Invalid JSON, start fresh
        }
      }

      // Point to our MCP config
      settings['mcp.configurationFile'] = this.configPath;
      settings['mcp.autoStart'] = true;
      settings['mcp.logLevel'] = 'info';

      await fs.writeFile(configPath, JSON.stringify(settings, null, 2));
      return true;
    }

    return false;
  }

  async autoDetectAndConfigure() {
    console.error('[Claude Manager] Auto-detecting Claude installations...');

    const detection = await this.detectClaude();

    if (!detection.summary.anyClaudeFound) {
      console.error('[Claude Manager] No Claude installations found');
      return {
        success: false,
        message: 'No Claude installations detected'
      };
    }

    console.error('[Claude Manager] Found Claude installations, configuring...');
    const result = await this.configureClaude();

    if (result.success) {
      console.error('[Claude Manager] Successfully configured Claude');
    } else {
      console.error('[Claude Manager] Failed to configure Claude');
    }

    return result;
  }

  // Helper methods

  resolvePathsForClaude(args) {
    if (!args) return [];

    return args.map(arg => {
      // If arg looks like a relative path, resolve it
      if (arg.startsWith('../') || arg.startsWith('./')) {
        return path.resolve(this.rootDir, arg);
      }
      return arg;
    });
  }

  getVSCodeConfigPaths() {
    const homeDir = os.homedir();
    const platform = os.platform();

    const paths = [];

    if (platform === 'darwin') {
      paths.push(
        path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json'),
        path.join(homeDir, '.vscode', 'settings.json')
      );
    } else if (platform === 'win32') {
      paths.push(
        path.join(process.env.APPDATA || '', 'Code', 'User', 'settings.json'),
        path.join(homeDir, '.vscode', 'settings.json')
      );
    } else {
      paths.push(
        path.join(homeDir, '.config', 'Code', 'User', 'settings.json'),
        path.join(homeDir, '.vscode', 'settings.json')
      );
    }

    return paths;
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readJSON(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
}

module.exports = ClaudeConfigManager;