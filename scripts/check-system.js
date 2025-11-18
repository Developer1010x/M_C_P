#!/usr/bin/env node

/**
 * System Compatibility Checker for MCP
 * Checks all requirements and provides detailed diagnostics
 */

const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI colors
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

class SystemChecker {
  constructor() {
    this.results = {
      os: {},
      node: {},
      python: {},
      permissions: {},
      network: {},
      disk: {},
      recommendations: []
    };
    this.errors = [];
    this.warnings = [];
    this.rootDir = path.join(__dirname, '..');
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  header(title) {
    console.log();
    this.log(`━━━ ${title} ━━━`, 'cyan');
  }

  async run() {
    this.log('╔══════════════════════════════════════════════╗', 'cyan');
    this.log('║       MCP System Compatibility Checker       ║', 'cyan');
    this.log('╚══════════════════════════════════════════════╝', 'cyan');

    await this.checkOS();
    await this.checkNode();
    await this.checkPython();
    await this.checkPermissions();
    await this.checkNetwork();
    await this.checkDiskSpace();
    await this.checkMCPStructure();

    this.printReport();
  }

  async checkOS() {
    this.header('Operating System');

    const platform = os.platform();
    const arch = os.arch();
    const release = os.release();
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);

    this.results.os = {
      platform,
      arch,
      release,
      totalMemory: `${totalMem} GB`,
      freeMemory: `${freeMem} GB`,
      cpus: os.cpus().length,
      uptime: Math.floor(os.uptime() / 3600) + ' hours'
    };

    // Platform-specific checks
    let platformName = 'Unknown';
    let supported = true;

    switch (platform) {
      case 'win32':
        platformName = 'Windows';
        this.results.os.version = os.version ? os.version() : release;
        break;
      case 'darwin':
        platformName = 'macOS';
        try {
          this.results.os.version = execSync('sw_vers -productVersion').toString().trim();
        } catch (e) {
          this.results.os.version = release;
        }
        break;
      case 'linux':
        platformName = 'Linux';
        try {
          if (fs.existsSync('/etc/os-release')) {
            const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
            const match = osRelease.match(/PRETTY_NAME="(.+)"/);
            if (match) {
              this.results.os.distribution = match[1];
            }
          }
        } catch (e) {
          // Ignore
        }
        break;
      default:
        supported = false;
        this.warnings.push(`Untested platform: ${platform}`);
    }

    this.log(`Platform: ${platformName} (${arch})`, 'green');
    this.log(`Version: ${this.results.os.version || release}`);
    this.log(`Memory: ${freeMem}/${totalMem} GB free`);
    this.log(`CPUs: ${this.results.os.cpus} cores`);

    if (!supported) {
      this.log(`⚠️  Platform may not be fully supported`, 'yellow');
    }

    // Check memory
    if (parseFloat(freeMem) < 0.5) {
      this.warnings.push('Low memory available (< 500MB)');
      this.log(`⚠️  Low memory warning`, 'yellow');
    }
  }

  async checkNode() {
    this.header('Node.js Environment');

    try {
      const nodeVersion = execSync('node --version').toString().trim();
      const npmVersion = execSync('npm --version').toString().trim();

      this.results.node = {
        installed: true,
        nodeVersion,
        npmVersion,
        nodePath: process.execPath,
        npmPath: execSync('which npm || where npm').toString().trim().split('\n')[0]
      };

      this.log(`Node.js: ${nodeVersion}`, 'green');
      this.log(`npm: ${npmVersion}`, 'green');
      this.log(`Path: ${process.execPath}`);

      // Version check
      const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
      if (majorVersion < 18) {
        this.errors.push(`Node.js version too old (${nodeVersion}). Version 18+ required.`);
        this.log(`❌ Version 18+ required`, 'red');
        this.results.node.compatible = false;
      } else {
        this.results.node.compatible = true;
      }

      // Check npm registry
      try {
        execSync('npm ping', { stdio: 'ignore' });
        this.results.node.npmRegistry = 'accessible';
        this.log(`npm registry: Accessible`, 'green');
      } catch (e) {
        this.warnings.push('npm registry not accessible');
        this.results.node.npmRegistry = 'not accessible';
        this.log(`⚠️  npm registry not accessible`, 'yellow');
      }

    } catch (error) {
      this.results.node = {
        installed: false,
        error: error.message
      };
      this.errors.push('Node.js is not installed');
      this.log(`❌ Node.js not found`, 'red');
      this.recommendations.push('Install Node.js from https://nodejs.org');
    }
  }

  async checkPython() {
    this.header('Python Environment (Optional)');

    const pythonCommands = ['python3', 'python', 'py'];
    let pythonFound = false;

    for (const cmd of pythonCommands) {
      try {
        const version = execSync(`${cmd} --version 2>&1`).toString().trim();
        const pipVersion = execSync(`${cmd} -m pip --version 2>&1`).toString().trim();

        this.results.python = {
          installed: true,
          command: cmd,
          version,
          pipVersion: pipVersion.split(' ')[1] || 'unknown',
          compatible: true
        };

        this.log(`Python: ${version}`, 'green');
        this.log(`pip: ${this.results.python.pipVersion}`, 'green');
        this.log(`Command: ${cmd}`);

        pythonFound = true;
        break;
      } catch (e) {
        // Continue to next command
      }
    }

    if (!pythonFound) {
      this.results.python = {
        installed: false
      };
      this.log(`⚠️  Python not found (optional for Python MCP servers)`, 'yellow');
      this.warnings.push('Python not installed (optional)');
    }
  }

  async checkPermissions() {
    this.header('File System Permissions');

    const testDir = path.join(os.tmpdir(), 'mcp-test-' + Date.now());
    const testFile = path.join(testDir, 'test.txt');

    try {
      // Test directory creation
      fs.mkdirSync(testDir);
      this.results.permissions.createDir = true;

      // Test file writing
      fs.writeFileSync(testFile, 'test');
      this.results.permissions.writeFile = true;

      // Test file reading
      fs.readFileSync(testFile);
      this.results.permissions.readFile = true;

      // Test file deletion
      fs.unlinkSync(testFile);
      fs.rmdirSync(testDir);
      this.results.permissions.deleteFile = true;

      this.log(`✓ All file permissions OK`, 'green');

    } catch (error) {
      this.errors.push(`Permission error: ${error.message}`);
      this.log(`❌ Permission issues detected`, 'red');
      this.results.permissions.error = error.message;
    }

    // Check MCP directory permissions
    try {
      const testMCPFile = path.join(this.rootDir, '.permission-test');
      fs.writeFileSync(testMCPFile, 'test');
      fs.unlinkSync(testMCPFile);
      this.results.permissions.mcpDir = true;
      this.log(`✓ MCP directory writable`, 'green');
    } catch (e) {
      this.warnings.push('MCP directory not writable');
      this.results.permissions.mcpDir = false;
      this.log(`⚠️  MCP directory not writable`, 'yellow');
    }
  }

  async checkNetwork() {
    this.header('Network Connectivity');

    const hosts = [
      { name: 'npm registry', host: 'registry.npmjs.org', critical: true },
      { name: 'GitHub', host: 'github.com', critical: false },
      { name: 'Python Package Index', host: 'pypi.org', critical: false }
    ];

    this.results.network = {};

    for (const { name, host, critical } of hosts) {
      try {
        if (os.platform() === 'win32') {
          execSync(`ping -n 1 ${host}`, { stdio: 'ignore' });
        } else {
          execSync(`ping -c 1 ${host}`, { stdio: 'ignore' });
        }
        this.results.network[host] = true;
        this.log(`✓ ${name}: Accessible`, 'green');
      } catch (e) {
        this.results.network[host] = false;
        if (critical) {
          this.errors.push(`Cannot reach ${name} (${host})`);
          this.log(`❌ ${name}: Not accessible`, 'red');
        } else {
          this.warnings.push(`Cannot reach ${name} (${host})`);
          this.log(`⚠️  ${name}: Not accessible`, 'yellow');
        }
      }
    }
  }

  async checkDiskSpace() {
    this.header('Disk Space');

    // Simple disk space check (platform agnostic)
    const tmpDir = os.tmpdir();
    const testSize = 100 * 1024 * 1024; // 100MB

    try {
      const testFile = path.join(tmpDir, 'mcp-space-test');
      const buffer = Buffer.alloc(1024 * 1024); // 1MB buffer

      const stream = fs.createWriteStream(testFile);
      for (let i = 0; i < 100; i++) {
        stream.write(buffer);
      }
      stream.end();

      // Wait for write to complete
      await new Promise(resolve => stream.on('finish', resolve));

      fs.unlinkSync(testFile);

      this.results.disk.adequate = true;
      this.log(`✓ Adequate disk space available`, 'green');

    } catch (error) {
      this.warnings.push('Low disk space detected');
      this.results.disk.adequate = false;
      this.log(`⚠️  May have insufficient disk space`, 'yellow');
    }
  }

  async checkMCPStructure() {
    this.header('MCP Installation');

    const requiredDirs = ['servers', 'config', 'launchers', 'cli', 'scripts', 'docs'];
    const requiredFiles = ['config/mcp.json', 'launchers/run-all.js', 'scripts/install.js'];

    this.results.mcp = {
      dirs: {},
      files: {}
    };

    // Check directories
    for (const dir of requiredDirs) {
      const dirPath = path.join(this.rootDir, dir);
      if (fs.existsSync(dirPath)) {
        this.results.mcp.dirs[dir] = true;
      } else {
        this.results.mcp.dirs[dir] = false;
        this.warnings.push(`Missing directory: ${dir}`);
      }
    }

    // Check files
    for (const file of requiredFiles) {
      const filePath = path.join(this.rootDir, file);
      if (fs.existsSync(filePath)) {
        this.results.mcp.files[file] = true;
      } else {
        this.results.mcp.files[file] = false;
        this.warnings.push(`Missing file: ${file}`);
      }
    }

    const totalDirs = Object.keys(this.results.mcp.dirs).length;
    const foundDirs = Object.values(this.results.mcp.dirs).filter(v => v).length;
    const totalFiles = Object.keys(this.results.mcp.files).length;
    const foundFiles = Object.values(this.results.mcp.files).filter(v => v).length;

    this.log(`Directories: ${foundDirs}/${totalDirs} found`);
    this.log(`Files: ${foundFiles}/${totalFiles} found`);

    if (foundDirs === totalDirs && foundFiles === totalFiles) {
      this.log(`✓ MCP structure complete`, 'green');
    } else {
      this.log(`⚠️  MCP structure incomplete`, 'yellow');
      this.recommendations.push('Run the installer to fix missing components');
    }
  }

  printReport() {
    console.log();
    this.log('═══════════════════════════════════════════════', 'cyan');
    this.log('                 SYSTEM REPORT', 'bright');
    this.log('═══════════════════════════════════════════════', 'cyan');

    // Overall status
    const status = this.errors.length === 0 ?
      (this.warnings.length === 0 ? 'READY' : 'READY WITH WARNINGS') :
      'NOT READY';

    const statusColor = this.errors.length === 0 ?
      (this.warnings.length === 0 ? 'green' : 'yellow') :
      'red';

    console.log();
    this.log(`System Status: ${status}`, statusColor);

    // Errors
    if (this.errors.length > 0) {
      console.log();
      this.log('❌ Critical Issues:', 'red');
      this.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log();
      this.log('⚠️  Warnings:', 'yellow');
      this.warnings.forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }

    // Recommendations
    if (this.recommendations.length > 0) {
      console.log();
      this.log('💡 Recommendations:', 'blue');
      this.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }

    // Next steps
    console.log();
    this.log('Next Steps:', 'cyan');

    if (this.errors.length > 0) {
      console.log('1. Fix critical issues listed above');
      console.log('2. Run this checker again: node scripts/check-system.js');
      console.log('3. Once fixed, run setup: ./setup.sh (Unix) or setup.bat (Windows)');
    } else {
      console.log('1. Run the setup script:');
      console.log('   • Unix/macOS: ./setup.sh');
      console.log('   • Windows: setup.bat');
      console.log('2. Follow the installation prompts');
      console.log('3. Start MCP servers: node launchers/run-all.js');
    }

    // Save report
    const reportPath = path.join(this.rootDir, 'system-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      status,
      results: this.results,
      errors: this.errors,
      warnings: this.warnings,
      recommendations: this.recommendations
    }, null, 2));

    console.log();
    this.log(`Report saved to: system-report.json`, 'green');
  }
}

// Run checker
if (require.main === module) {
  const checker = new SystemChecker();
  checker.run().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = SystemChecker;