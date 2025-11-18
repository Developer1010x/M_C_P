/**
 * Universal AI Agent Connector
 * Supports all major LLM providers and custom agents
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class AIAgentConnector {
  constructor() {
    this.agents = this.initializeAgents();
    this.configurations = new Map();
  }

  initializeAgents() {
    return new Map([
      ['claude', {
        name: 'Claude (Anthropic)',
        type: 'anthropic',
        configFormat: 'mcp',
        supported: true,
        configPaths: this.getClaudePaths(),
        documentation: 'https://docs.anthropic.com/mcp',
        features: ['native-mcp', 'streaming', 'function-calling']
      }],

      ['openai', {
        name: 'OpenAI GPT',
        type: 'openai',
        configFormat: 'function-calling',
        supported: true,
        configPaths: this.getOpenAIPaths(),
        documentation: 'https://platform.openai.com/docs',
        features: ['function-calling', 'plugins', 'assistants-api']
      }],

      ['gemini', {
        name: 'Google Gemini',
        type: 'google',
        configFormat: 'vertex-ai',
        supported: true,
        configPaths: this.getGeminiPaths(),
        documentation: 'https://ai.google.dev/',
        features: ['function-calling', 'multi-modal']
      }],

      ['llama', {
        name: 'Meta Llama',
        type: 'meta',
        configFormat: 'ollama',
        supported: true,
        configPaths: this.getLlamaPaths(),
        documentation: 'https://ollama.ai',
        features: ['local-deployment', 'custom-models']
      }],

      ['mistral', {
        name: 'Mistral AI',
        type: 'mistral',
        configFormat: 'api',
        supported: true,
        configPaths: this.getMistralPaths(),
        documentation: 'https://docs.mistral.ai',
        features: ['function-calling', 'embeddings']
      }],

      ['cohere', {
        name: 'Cohere',
        type: 'cohere',
        configFormat: 'api',
        supported: true,
        configPaths: this.getCoherePaths(),
        documentation: 'https://docs.cohere.com',
        features: ['rag', 'embeddings', 'reranking']
      }],

      ['huggingface', {
        name: 'HuggingFace',
        type: 'huggingface',
        configFormat: 'transformers',
        supported: true,
        configPaths: this.getHuggingFacePaths(),
        documentation: 'https://huggingface.co/docs',
        features: ['model-hub', 'inference-api', 'spaces']
      }],

      ['azure-openai', {
        name: 'Azure OpenAI',
        type: 'azure',
        configFormat: 'azure-functions',
        supported: true,
        configPaths: this.getAzurePaths(),
        documentation: 'https://docs.microsoft.com/azure/cognitive-services',
        features: ['enterprise', 'compliance', 'private-endpoints']
      }],

      ['aws-bedrock', {
        name: 'AWS Bedrock',
        type: 'aws',
        configFormat: 'bedrock',
        supported: true,
        configPaths: this.getAWSPaths(),
        documentation: 'https://aws.amazon.com/bedrock',
        features: ['multi-model', 'enterprise', 'rag']
      }],

      ['langchain', {
        name: 'LangChain',
        type: 'framework',
        configFormat: 'langchain',
        supported: true,
        configPaths: this.getLangChainPaths(),
        documentation: 'https://langchain.com',
        features: ['agent-framework', 'chains', 'memory']
      }],

      ['autogen', {
        name: 'AutoGen (Microsoft)',
        type: 'framework',
        configFormat: 'autogen',
        supported: true,
        configPaths: this.getAutoGenPaths(),
        documentation: 'https://github.com/microsoft/autogen',
        features: ['multi-agent', 'code-execution', 'conversation']
      }],

      ['custom', {
        name: 'Custom LLM',
        type: 'custom',
        configFormat: 'custom',
        supported: true,
        configPaths: this.getCustomPaths(),
        documentation: 'User-defined',
        features: ['user-defined']
      }]
    ]);
  }

  // Path getters for each AI agent
  getClaudePaths() {
    const homeDir = os.homedir();
    const platform = os.platform();

    if (platform === 'darwin') {
      return {
        desktop: path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
        cli: path.join(homeDir, '.config', 'claude', 'config.json')
      };
    } else if (platform === 'win32') {
      return {
        desktop: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
        cli: path.join(process.env.APPDATA || '', 'claude-cli', 'config.json')
      };
    } else {
      return {
        desktop: path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json'),
        cli: path.join(homeDir, '.config', 'claude', 'config.json')
      };
    }
  }

  getOpenAIPaths() {
    const homeDir = os.homedir();
    return {
      config: path.join(homeDir, '.openai', 'config.json'),
      env: path.join(homeDir, '.env'),
      credentials: path.join(homeDir, '.openai', 'credentials.json')
    };
  }

  getGeminiPaths() {
    const homeDir = os.homedir();
    return {
      config: path.join(homeDir, '.google', 'gemini-config.json'),
      credentials: path.join(homeDir, '.google', 'application_default_credentials.json')
    };
  }

  getLlamaPaths() {
    const homeDir = os.homedir();
    return {
      ollama: path.join(homeDir, '.ollama', 'config.json'),
      models: path.join(homeDir, '.ollama', 'models'),
      llamafile: path.join(homeDir, '.llamafile', 'config.json')
    };
  }

  getMistralPaths() {
    const homeDir = os.homedir();
    return {
      config: path.join(homeDir, '.mistral', 'config.json'),
      credentials: path.join(homeDir, '.mistral', 'credentials.json')
    };
  }

  getCoherePaths() {
    const homeDir = os.homedir();
    return {
      config: path.join(homeDir, '.cohere', 'config.json'),
      credentials: path.join(homeDir, '.cohere', 'api_key')
    };
  }

  getHuggingFacePaths() {
    const homeDir = os.homedir();
    return {
      config: path.join(homeDir, '.huggingface', 'config.json'),
      token: path.join(homeDir, '.huggingface', 'token'),
      cache: path.join(homeDir, '.cache', 'huggingface')
    };
  }

  getAzurePaths() {
    const homeDir = os.homedir();
    return {
      config: path.join(homeDir, '.azure', 'config.json'),
      credentials: path.join(homeDir, '.azure', 'credentials.json')
    };
  }

  getAWSPaths() {
    const homeDir = os.homedir();
    return {
      config: path.join(homeDir, '.aws', 'config'),
      credentials: path.join(homeDir, '.aws', 'credentials'),
      bedrock: path.join(homeDir, '.aws', 'bedrock-config.json')
    };
  }

  getLangChainPaths() {
    const homeDir = os.homedir();
    return {
      config: path.join(homeDir, '.langchain', 'config.json'),
      env: path.join(homeDir, '.langchain', '.env')
    };
  }

  getAutoGenPaths() {
    const homeDir = os.homedir();
    return {
      config: path.join(homeDir, '.autogen', 'config.json'),
      agents: path.join(homeDir, '.autogen', 'agents')
    };
  }

  getCustomPaths() {
    const homeDir = os.homedir();
    return {
      config: path.join(homeDir, '.mcp', 'custom-agents.json')
    };
  }

  // Main methods
  async listAgents() {
    const agentList = [];

    for (const [key, agent] of this.agents) {
      const status = await this.checkAgentStatus(key);
      agentList.push({
        id: key,
        ...agent,
        status
      });
    }

    return {
      success: true,
      agents: agentList,
      total: agentList.length,
      configured: agentList.filter(a => a.status.configured).length
    };
  }

  async checkAgentStatus(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { installed: false, configured: false, connected: false };
    }

    const status = {
      installed: false,
      configured: false,
      connected: false,
      details: {}
    };

    // Check if agent is installed/configured
    switch (agentId) {
      case 'claude':
        status.installed = await this.fileExists(agent.configPaths.desktop) ||
                          await this.fileExists(agent.configPaths.cli);
        status.configured = status.installed;
        break;

      case 'openai':
        status.installed = await this.hasAPIKey('OPENAI_API_KEY');
        status.configured = status.installed;
        status.details.hasKey = status.installed;
        break;

      case 'gemini':
        status.installed = await this.hasAPIKey('GOOGLE_API_KEY') ||
                          await this.fileExists(agent.configPaths.credentials);
        status.configured = status.installed;
        break;

      case 'llama':
        status.installed = await this.checkOllamaInstalled();
        status.configured = status.installed;
        break;

      case 'mistral':
        status.installed = await this.hasAPIKey('MISTRAL_API_KEY');
        status.configured = status.installed;
        break;

      case 'azure-openai':
        status.installed = await this.hasAPIKey('AZURE_OPENAI_KEY');
        status.configured = status.installed;
        break;

      case 'aws-bedrock':
        status.installed = await this.fileExists(agent.configPaths.credentials);
        status.configured = status.installed;
        break;

      case 'langchain':
        status.installed = await this.checkNodePackageInstalled('langchain');
        status.configured = status.installed;
        break;

      case 'custom':
        status.installed = true; // Always available
        status.configured = await this.fileExists(agent.configPaths.config);
        break;

      default:
        // For other agents, check if config exists
        if (agent.configPaths.config) {
          status.installed = await this.fileExists(agent.configPaths.config);
          status.configured = status.installed;
        }
    }

    return status;
  }

  async configureAgent(agentId, config) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return {
        success: false,
        error: `Unknown agent: ${agentId}`
      };
    }

    try {
      // Agent-specific configuration
      switch (agentId) {
        case 'claude':
          return await this.configureClaude(config);

        case 'openai':
          return await this.configureOpenAI(config);

        case 'gemini':
          return await this.configureGemini(config);

        case 'llama':
          return await this.configureLlama(config);

        case 'mistral':
          return await this.configureMistral(config);

        case 'langchain':
          return await this.configureLangChain(config);

        case 'custom':
          return await this.configureCustom(config);

        default:
          return await this.configureGeneric(agentId, config);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Configuration methods for specific agents
  async configureClaude(config) {
    // Claude configuration is handled by ClaudeConfigManager
    return {
      success: true,
      message: 'Claude configuration is managed by ClaudeConfigManager'
    };
  }

  async configureOpenAI(config) {
    const configPath = this.agents.get('openai').configPaths.config;
    const configDir = path.dirname(configPath);

    await fs.mkdir(configDir, { recursive: true });

    // Create OpenAI configuration wrapper for MCP
    const openAIConfig = {
      api_key: config.apiKey || process.env.OPENAI_API_KEY,
      organization: config.organization,
      mcp_integration: {
        enabled: true,
        function_calling: true,
        tools: this.convertMCPToOpenAITools(config.mcpServers),
        system_prompt: this.generateOpenAISystemPrompt()
      }
    };

    await fs.writeFile(configPath, JSON.stringify(openAIConfig, null, 2));

    // Also create a Python wrapper for OpenAI
    const pythonWrapper = this.generateOpenAIPythonWrapper(config);
    await fs.writeFile(
      path.join(configDir, 'mcp_wrapper.py'),
      pythonWrapper
    );

    return {
      success: true,
      message: 'OpenAI configured for MCP',
      configPath,
      wrapperPath: path.join(configDir, 'mcp_wrapper.py')
    };
  }

  async configureGemini(config) {
    const configPath = this.agents.get('gemini').configPaths.config;
    const configDir = path.dirname(configPath);

    await fs.mkdir(configDir, { recursive: true });

    const geminiConfig = {
      api_key: config.apiKey || process.env.GOOGLE_API_KEY,
      project_id: config.projectId,
      location: config.location || 'us-central1',
      mcp_integration: {
        enabled: true,
        function_declarations: this.convertMCPToGeminiTools(config.mcpServers)
      }
    };

    await fs.writeFile(configPath, JSON.stringify(geminiConfig, null, 2));

    return {
      success: true,
      message: 'Gemini configured for MCP',
      configPath
    };
  }

  async configureLlama(config) {
    const configPath = this.agents.get('llama').configPaths.ollama;
    const configDir = path.dirname(configPath);

    await fs.mkdir(configDir, { recursive: true });

    const llamaConfig = {
      model: config.model || 'llama2',
      host: config.host || 'http://localhost:11434',
      mcp_integration: {
        enabled: true,
        system_prompt: this.generateLlamaSystemPrompt(),
        tools: config.mcpServers
      }
    };

    await fs.writeFile(configPath, JSON.stringify(llamaConfig, null, 2));

    // Create Ollama Modelfile for MCP
    const modelfile = this.generateOllamaModelfile(config);
    await fs.writeFile(
      path.join(configDir, 'MCP-Modelfile'),
      modelfile
    );

    return {
      success: true,
      message: 'Llama/Ollama configured for MCP',
      configPath,
      modelfilePath: path.join(configDir, 'MCP-Modelfile')
    };
  }

  async configureMistral(config) {
    const configPath = this.agents.get('mistral').configPaths.config;
    const configDir = path.dirname(configPath);

    await fs.mkdir(configDir, { recursive: true });

    const mistralConfig = {
      api_key: config.apiKey || process.env.MISTRAL_API_KEY,
      model: config.model || 'mistral-medium',
      mcp_integration: {
        enabled: true,
        tools: this.convertMCPToMistralTools(config.mcpServers)
      }
    };

    await fs.writeFile(configPath, JSON.stringify(mistralConfig, null, 2));

    return {
      success: true,
      message: 'Mistral configured for MCP',
      configPath
    };
  }

  async configureLangChain(config) {
    const configPath = this.agents.get('langchain').configPaths.config;
    const configDir = path.dirname(configPath);

    await fs.mkdir(configDir, { recursive: true });

    // Create LangChain configuration with MCP tools
    const langchainConfig = {
      llm: config.llm || 'openai',
      llm_config: config.llmConfig || {},
      mcp_tools: config.mcpServers,
      chains: this.generateLangChainChains(config.mcpServers),
      agents: this.generateLangChainAgents(config.mcpServers)
    };

    await fs.writeFile(configPath, JSON.stringify(langchainConfig, null, 2));

    // Generate Python/JS code for LangChain integration
    const code = this.generateLangChainCode(config);
    await fs.writeFile(
      path.join(configDir, 'mcp_langchain.py'),
      code.python
    );
    await fs.writeFile(
      path.join(configDir, 'mcp_langchain.js'),
      code.javascript
    );

    return {
      success: true,
      message: 'LangChain configured for MCP',
      configPath,
      codePaths: {
        python: path.join(configDir, 'mcp_langchain.py'),
        javascript: path.join(configDir, 'mcp_langchain.js')
      }
    };
  }

  async configureCustom(config) {
    const configPath = this.agents.get('custom').configPaths.config;
    const configDir = path.dirname(configPath);

    await fs.mkdir(configDir, { recursive: true });

    // Load existing custom agents
    let customAgents = {};
    if (await this.fileExists(configPath)) {
      const content = await fs.readFile(configPath, 'utf8');
      customAgents = JSON.parse(content);
    }

    // Add new custom agent
    const agentId = config.id || `custom-${Date.now()}`;
    customAgents[agentId] = {
      name: config.name,
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      headers: config.headers || {},
      requestFormat: config.requestFormat || 'json',
      responseFormat: config.responseFormat || 'json',
      mcpMapping: config.mcpMapping || this.getDefaultMCPMapping(),
      created: new Date().toISOString()
    };

    await fs.writeFile(configPath, JSON.stringify(customAgents, null, 2));

    return {
      success: true,
      message: `Custom agent '${config.name}' configured`,
      agentId,
      configPath
    };
  }

  async configureGeneric(agentId, config) {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.configPaths.config) {
      return {
        success: false,
        error: 'Agent does not support configuration'
      };
    }

    const configPath = agent.configPaths.config;
    const configDir = path.dirname(configPath);

    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    return {
      success: true,
      message: `${agent.name} configured`,
      configPath
    };
  }

  // Tool conversion methods
  convertMCPToOpenAITools(mcpServers) {
    if (!mcpServers) return [];

    const tools = [];
    for (const [name, server] of Object.entries(mcpServers)) {
      tools.push({
        type: 'function',
        function: {
          name: `mcp_${name}`,
          description: server.description || `MCP Server: ${name}`,
          parameters: {
            type: 'object',
            properties: {
              tool: { type: 'string', description: 'Tool name to execute' },
              params: { type: 'object', description: 'Tool parameters' }
            },
            required: ['tool']
          }
        }
      });
    }
    return tools;
  }

  convertMCPToGeminiTools(mcpServers) {
    if (!mcpServers) return [];

    const tools = [];
    for (const [name, server] of Object.entries(mcpServers)) {
      tools.push({
        name: `mcp_${name}`,
        description: server.description || `MCP Server: ${name}`,
        parameters: {
          type: 'object',
          properties: {
            tool: { type: 'string' },
            params: { type: 'object' }
          }
        }
      });
    }
    return tools;
  }

  convertMCPToMistralTools(mcpServers) {
    // Similar to OpenAI format
    return this.convertMCPToOpenAITools(mcpServers);
  }

  // Code generation methods
  generateOpenAISystemPrompt() {
    return `You have access to MCP (Model Context Protocol) servers that provide various tools and capabilities.
When you need to use an MCP tool, call the appropriate function with the tool name and parameters.
Each MCP server may have multiple tools available. Use them to assist with user requests.`;
  }

  generateLlamaSystemPrompt() {
    return `You are an AI assistant with access to MCP (Model Context Protocol) servers.
These servers provide tools for various tasks. When appropriate, use these tools to help users.
Always explain what tools you're using and why.`;
  }

  generateOpenAIPythonWrapper(config) {
    return `#!/usr/bin/env python3
"""
OpenAI MCP Wrapper
Auto-generated by MCP Manager
"""

import os
import json
import openai
from typing import Dict, Any

class OpenAIMCPWrapper:
    def __init__(self):
        self.client = openai.OpenAI(
            api_key=os.getenv('OPENAI_API_KEY', '${config.apiKey || ''}')
        )
        self.mcp_servers = ${JSON.stringify(config.mcpServers || {}, null, 4)}

    def call_mcp_tool(self, server: str, tool: str, params: Dict[str, Any]):
        """Execute an MCP tool through the appropriate server"""
        # Implementation would connect to actual MCP server
        pass

    def chat_with_tools(self, messages, model="gpt-4"):
        """Chat with OpenAI using MCP tools"""
        tools = []
        for server_name, server_config in self.mcp_servers.items():
            tools.append({
                "type": "function",
                "function": {
                    "name": f"mcp_{server_name}",
                    "description": server_config.get('description', f'MCP Server: {server_name}'),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "tool": {"type": "string"},
                            "params": {"type": "object"}
                        }
                    }
                }
            })

        response = self.client.chat.completions.create(
            model=model,
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )

        return response

if __name__ == "__main__":
    wrapper = OpenAIMCPWrapper()
    # Example usage
    response = wrapper.chat_with_tools([
        {"role": "user", "content": "List files in the current directory"}
    ])
    print(response)
`;
  }

  generateOllamaModelfile(config) {
    return `# MCP-Enhanced Llama Model
FROM ${config.model || 'llama2'}

SYSTEM """
You are an AI assistant with access to MCP (Model Context Protocol) servers.
Available MCP servers and their tools:
${JSON.stringify(config.mcpServers || {}, null, 2)}

When you need to use an MCP tool, format your response as:
[MCP_CALL: server="server_name" tool="tool_name" params={...}]

Always explain what you're doing when using MCP tools.
"""

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1
`;
  }

  generateLangChainChains(mcpServers) {
    return {
      mcp_chain: {
        type: 'sequential',
        steps: [
          { type: 'prompt', template: 'Process user request with MCP tools' },
          { type: 'llm', model: 'default' },
          { type: 'mcp_tool_executor' },
          { type: 'output_parser' }
        ]
      }
    };
  }

  generateLangChainAgents(mcpServers) {
    return {
      mcp_agent: {
        type: 'react',
        tools: Object.keys(mcpServers || {}).map(name => `mcp_${name}`),
        llm: 'default',
        verbose: true
      }
    };
  }

  generateLangChainCode(config) {
    const python = `#!/usr/bin/env python3
"""
LangChain MCP Integration
Auto-generated by MCP Manager
"""

from langchain.agents import Tool, AgentExecutor, create_react_agent
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
import json

class MCPLangChain:
    def __init__(self):
        self.llm = OpenAI()
        self.mcp_servers = ${JSON.stringify(config.mcpServers || {}, null, 4)}
        self.tools = self.create_mcp_tools()

    def create_mcp_tools(self):
        tools = []
        for server_name, server_config in self.mcp_servers.items():
            tool = Tool(
                name=f"mcp_{server_name}",
                description=server_config.get('description', f'MCP Server: {server_name}'),
                func=lambda x, s=server_name: self.execute_mcp_tool(s, x)
            )
            tools.append(tool)
        return tools

    def execute_mcp_tool(self, server, input_str):
        # Implementation would connect to actual MCP server
        return f"Executed {input_str} on {server}"

if __name__ == "__main__":
    mcp = MCPLangChain()
    # Use the tools with LangChain agents
`;

    const javascript = `#!/usr/bin/env node
/**
 * LangChain MCP Integration
 * Auto-generated by MCP Manager
 */

const { OpenAI } = require('langchain/llms/openai');
const { initializeAgentExecutorWithOptions } = require('langchain/agents');
const { DynamicTool } = require('langchain/tools');

class MCPLangChain {
    constructor() {
        this.llm = new OpenAI();
        this.mcpServers = ${JSON.stringify(config.mcpServers || {}, null, 4)};
        this.tools = this.createMCPTools();
    }

    createMCPTools() {
        const tools = [];
        for (const [serverName, serverConfig] of Object.entries(this.mcpServers)) {
            const tool = new DynamicTool({
                name: \`mcp_\${serverName}\`,
                description: serverConfig.description || \`MCP Server: \${serverName}\`,
                func: async (input) => this.executeMCPTool(serverName, input)
            });
            tools.push(tool);
        }
        return tools;
    }

    async executeMCPTool(server, input) {
        // Implementation would connect to actual MCP server
        return \`Executed \${input} on \${server}\`;
    }
}

module.exports = MCPLangChain;
`;

    return { python, javascript };
  }

  getDefaultMCPMapping() {
    return {
      request: {
        tool: '$.tool',
        params: '$.params'
      },
      response: {
        result: '$.result',
        error: '$.error'
      }
    };
  }

  // Helper methods
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async hasAPIKey(keyName) {
    return !!process.env[keyName];
  }

  async checkOllamaInstalled() {
    try {
      const { execSync } = require('child_process');
      execSync('ollama --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  async checkNodePackageInstalled(packageName) {
    try {
      require.resolve(packageName);
      return true;
    } catch {
      return false;
    }
  }

  getSupportedAgents() {
    return Array.from(this.agents.keys());
  }
}

module.exports = AIAgentConnector;