#!/usr/bin/env node

/**
 * Filesystem MCP Server
 * Provides file system operations for Claude and other MCP clients
 *
 * Tools available:
 * - readFile: Read file contents
 * - writeFile: Write content to file
 * - listDirectory: List directory contents
 * - deleteFile: Delete a file
 * - moveFile: Move/rename a file
 * - searchFiles: Search files by pattern
 * - getFileInfo: Get file metadata
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');
const mime = require('mime-types');
const readline = require('readline');

// MCP Protocol Implementation
class MCPServer {
  constructor() {
    this.tools = new Map();
    this.serverName = process.env.MCP_NAME || 'filesystem-mcp';
    this.debug = process.argv.includes('--debug');
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
  }

  log(level, message, data = {}) {
    if (level === 'debug' && !this.debug) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      server: this.serverName,
      message,
      ...data
    };

    console.error(JSON.stringify(logEntry));
  }

  async initialize() {
    this.log('info', 'Initializing Filesystem MCP Server');

    // Register all available tools
    this.registerTool('readFile', this.readFile.bind(this));
    this.registerTool('writeFile', this.writeFile.bind(this));
    this.registerTool('listDirectory', this.listDirectory.bind(this));
    this.registerTool('deleteFile', this.deleteFile.bind(this));
    this.registerTool('moveFile', this.moveFile.bind(this));
    this.registerTool('searchFiles', this.searchFiles.bind(this));
    this.registerTool('getFileInfo', this.getFileInfo.bind(this));

    // Send initialization response
    this.sendResponse({
      type: 'initialize',
      status: 'success',
      serverName: this.serverName,
      version: '1.0.0',
      tools: Array.from(this.tools.keys()).map(name => ({
        name,
        description: this.getToolDescription(name)
      }))
    });

    this.log('info', 'Server initialized successfully', {
      toolCount: this.tools.size
    });
  }

  registerTool(name, handler) {
    this.tools.set(name, handler);
    this.log('debug', `Registered tool: ${name}`);
  }

  getToolDescription(toolName) {
    const descriptions = {
      readFile: 'Read the contents of a file',
      writeFile: 'Write content to a file',
      listDirectory: 'List contents of a directory',
      deleteFile: 'Delete a file',
      moveFile: 'Move or rename a file',
      searchFiles: 'Search for files using glob patterns',
      getFileInfo: 'Get detailed information about a file'
    };
    return descriptions[toolName] || 'No description available';
  }

  sendResponse(response) {
    const message = JSON.stringify(response);
    console.log(message);
  }

  sendError(error, requestId = null) {
    this.sendResponse({
      type: 'error',
      requestId,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error.stack
      }
    });
  }

  // File operation tools
  async readFile({ path: filePath, encoding = 'utf8' }) {
    try {
      const absolutePath = path.resolve(filePath);
      const content = await fs.readFile(absolutePath, encoding);

      return {
        success: true,
        path: absolutePath,
        content,
        size: Buffer.byteLength(content, encoding),
        encoding
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async writeFile({ path: filePath, content, encoding = 'utf8', createDirs = false }) {
    try {
      const absolutePath = path.resolve(filePath);

      // Create directories if requested
      if (createDirs) {
        const dir = path.dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });
      }

      await fs.writeFile(absolutePath, content, encoding);

      return {
        success: true,
        path: absolutePath,
        bytesWritten: Buffer.byteLength(content, encoding)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async listDirectory({ path: dirPath, recursive = false, includeHidden = false }) {
    try {
      const absolutePath = path.resolve(dirPath);
      const entries = [];

      if (!recursive) {
        const items = await fs.readdir(absolutePath, { withFileTypes: true });

        for (const item of items) {
          if (!includeHidden && item.name.startsWith('.')) continue;

          const itemPath = path.join(absolutePath, item.name);
          const stats = await fs.stat(itemPath);

          entries.push({
            name: item.name,
            path: itemPath,
            type: item.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime
          });
        }
      } else {
        // Recursive listing using glob
        const pattern = includeHidden ? '**/*' : '**/[!.]*';
        const files = await new Promise((resolve, reject) => {
          glob(pattern, { cwd: absolutePath, dot: includeHidden }, (err, matches) => {
            if (err) reject(err);
            else resolve(matches);
          });
        });

        for (const file of files) {
          const fullPath = path.join(absolutePath, file);
          try {
            const stats = await fs.stat(fullPath);
            entries.push({
              name: path.basename(file),
              path: fullPath,
              relativePath: file,
              type: stats.isDirectory() ? 'directory' : 'file',
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime
            });
          } catch (err) {
            // Skip files we can't access
            continue;
          }
        }
      }

      return {
        success: true,
        path: absolutePath,
        entries,
        count: entries.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async deleteFile({ path: filePath, force = false }) {
    try {
      const absolutePath = path.resolve(filePath);

      // Safety check - don't delete system files unless forced
      const dangerousPaths = ['/bin', '/usr', '/etc', 'C:\\Windows', 'C:\\Program Files'];
      if (!force && dangerousPaths.some(dp => absolutePath.startsWith(dp))) {
        throw new Error('Refusing to delete system file. Use force=true to override.');
      }

      await fs.unlink(absolutePath);

      return {
        success: true,
        path: absolutePath,
        deleted: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async moveFile({ source, destination, overwrite = false }) {
    try {
      const sourcePath = path.resolve(source);
      const destPath = path.resolve(destination);

      // Check if destination exists
      if (!overwrite) {
        try {
          await fs.access(destPath);
          throw new Error('Destination file exists. Use overwrite=true to replace.');
        } catch (err) {
          if (err.code !== 'ENOENT') throw err;
        }
      }

      // Create destination directory if needed
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });

      // Move the file
      await fs.rename(sourcePath, destPath);

      return {
        success: true,
        source: sourcePath,
        destination: destPath,
        moved: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async searchFiles({ pattern, cwd = '.', limit = 100 }) {
    try {
      const searchPath = path.resolve(cwd);

      const files = await new Promise((resolve, reject) => {
        glob(pattern, {
          cwd: searchPath,
          dot: true,
          nodir: false,
          limit
        }, (err, matches) => {
          if (err) reject(err);
          else resolve(matches);
        });
      });

      const results = [];
      for (const file of files.slice(0, limit)) {
        const fullPath = path.join(searchPath, file);
        try {
          const stats = await fs.stat(fullPath);
          results.push({
            path: fullPath,
            relativePath: file,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime
          });
        } catch (err) {
          // Skip files we can't access
          continue;
        }
      }

      return {
        success: true,
        pattern,
        cwd: searchPath,
        results,
        count: results.length,
        truncated: files.length > limit
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async getFileInfo({ path: filePath }) {
    try {
      const absolutePath = path.resolve(filePath);
      const stats = await fs.stat(absolutePath);

      const info = {
        path: absolutePath,
        name: path.basename(absolutePath),
        directory: path.dirname(absolutePath),
        extension: path.extname(absolutePath),
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        sizeReadable: this.formatBytes(stats.size),
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        permissions: stats.mode,
        mimeType: mime.lookup(absolutePath) || 'application/octet-stream'
      };

      return {
        success: true,
        ...info
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Message handling
  async handleMessage(message) {
    try {
      const request = JSON.parse(message);

      this.log('debug', 'Received request', {
        type: request.type,
        tool: request.tool
      });

      if (request.type === 'tool' && request.tool) {
        const handler = this.tools.get(request.tool);

        if (!handler) {
          this.sendError(new Error(`Unknown tool: ${request.tool}`), request.id);
          return;
        }

        const result = await handler(request.params || {});

        this.sendResponse({
          type: 'tool_response',
          requestId: request.id,
          tool: request.tool,
          result
        });
      } else if (request.type === 'list_tools') {
        this.sendResponse({
          type: 'tools_list',
          requestId: request.id,
          tools: Array.from(this.tools.keys()).map(name => ({
            name,
            description: this.getToolDescription(name)
          }))
        });
      } else if (request.type === 'ping') {
        this.sendResponse({
          type: 'pong',
          requestId: request.id,
          timestamp: Date.now()
        });
      } else {
        this.sendError(new Error(`Unknown request type: ${request.type}`), request.id);
      }
    } catch (error) {
      this.log('error', 'Failed to handle message', { error: error.message });
      this.sendError(error);
    }
  }

  // Start the server
  start() {
    this.initialize();

    // Handle incoming messages
    this.rl.on('line', (line) => {
      this.handleMessage(line);
    });

    // Handle shutdown
    process.on('SIGTERM', () => {
      this.log('info', 'Received SIGTERM, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      this.log('info', 'Received SIGINT, shutting down gracefully');
      this.shutdown();
    });

    this.log('info', 'Filesystem MCP Server started');
  }

  shutdown() {
    this.log('info', 'Shutting down server');
    this.rl.close();
    process.exit(0);
  }
}

// Start the server
const server = new MCPServer();
server.start();