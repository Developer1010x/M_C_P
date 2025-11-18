# 🚀 MCP System - Zero-Setup Installation Guide

## 🎯 One-Line Installation

Choose your platform and run ONE command - that's it!

### 🍎 macOS / Linux

```bash
curl -sSL https://raw.githubusercontent.com/yourusername/MCP/main/setup.sh | bash
```

Or if you've already cloned the repo:
```bash
chmod +x setup.sh && ./setup.sh
```

### 🪟 Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/yourusername/MCP/main/setup.ps1 | iex
```

Or if you've already cloned the repo:
```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

### 🪟 Windows (Simple)

If PowerShell doesn't work, just:
1. Download the MCP folder
2. Double-click `setup.bat`
3. Follow the prompts

---

## ✨ What the Installer Does

The setup script automatically:

1. ✅ **Installs Node.js** (if not present)
2. ✅ **Installs Python** (optional, for Python MCPs)
3. ✅ **Installs all dependencies**
4. ✅ **Configures your environment**
5. ✅ **Sets up global commands**
6. ✅ **Creates start scripts**
7. ✅ **Verifies everything works**

**No technical knowledge required!**

---

## 🔍 Pre-Installation Check (Optional)

Want to check if your system is ready?

```bash
node scripts/check-system.js
```

This will tell you:
- What's already installed
- What needs to be installed
- Any potential issues
- Recommendations

---

## 📦 Manual Installation

If you prefer to install prerequisites manually:

### Prerequisites

1. **Node.js 18+ and npm**
   - Windows: Download from [nodejs.org](https://nodejs.org)
   - macOS: `brew install node`
   - Linux: `sudo apt install nodejs npm`

2. **Python 3.8+** (Optional)
   - Windows: Download from [python.org](https://python.org)
   - macOS: `brew install python`
   - Linux: `sudo apt install python3 python3-pip`

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/MCP.git
cd MCP

# 2. Run the installer
node scripts/install.js

# 3. Copy environment file
cp .env.example .env

# 4. Start the servers
node launchers/run-all.js
```

---

## 🚦 Quick Start After Installation

### Option 1: Use the start script
```bash
# Windows
start.bat

# macOS/Linux
./start.sh
```

### Option 2: Use the CLI
```bash
mcp start    # If global command is installed
# OR
node cli/mcp-cli.js start
```

### Option 3: Direct launch
```bash
node launchers/run-all.js
```

---

## 🆘 Troubleshooting

### "Command not found" errors

**On Windows:**
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**On macOS/Linux:**
```bash
chmod +x setup.sh
chmod +x launchers/run-all.sh
```

### "Permission denied" errors

**On Windows:**
- Right-click setup.bat → "Run as Administrator"

**On macOS/Linux:**
```bash
sudo chmod -R 755 MCP
sudo chown -R $(whoami) MCP
```

### Network/Proxy Issues

Create a `.npmrc` file:
```ini
proxy=http://your-proxy:8080
https-proxy=http://your-proxy:8080
```

### Still Having Issues?

1. Run the system checker:
   ```bash
   node scripts/check-system.js
   ```

2. Check the setup log:
   - Windows: `setup.log`
   - macOS/Linux: `setup.log`

3. Get help:
   - Open an issue on GitHub
   - Check `docs/TROUBLESHOOTING.md`

---

## 🎉 Success Indicators

You'll know installation succeeded when you see:

```
╔════════════════════════════════════════════════════════╗
║                                                        ║
║         🎉 Installation Complete! 🎉                   ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

And you can run:
```bash
node cli/mcp-cli.js health
```

Which should show:
```
✅ Node.js: Installed
✅ npm: Installed
✅ Configuration: Valid
✅ MCP System: Ready
```

---

## 🌍 Supported Platforms

| Platform | Version | Tested | Auto-Install |
|----------|---------|--------|--------------|
| Windows 11 | 22H2+ | ✅ | ✅ |
| Windows 10 | 1909+ | ✅ | ✅ |
| macOS | 11+ | ✅ | ✅ |
| Ubuntu | 20.04+ | ✅ | ✅ |
| Debian | 10+ | ✅ | ✅ |
| Fedora | 34+ | ✅ | ✅ |
| Arch Linux | Latest | ✅ | ✅ |
| WSL2 | Latest | ✅ | ✅ |
| Docker | Latest | ✅ | Manual |

---

## 🔐 Security Notes

The setup scripts:
- ✅ Only download from official sources (nodejs.org, python.org)
- ✅ Don't require root/admin (except for global installs)
- ✅ Don't modify system files
- ✅ Create all files in the MCP directory
- ✅ Can be fully audited (all scripts are readable)

---

## 📝 What Gets Installed

```
MCP/
├── node_modules/        # Node.js dependencies (auto-installed)
├── .env                 # Your configuration (created from template)
├── start.bat           # Windows quick-start (created)
├── start.sh            # Unix quick-start (created)
└── system-report.json  # System compatibility report (created)
```

**Nothing is installed globally except** (optional):
- `mcp` command (via npm link)

---

## 🚀 Next Steps

After installation:

1. **Add API Keys** (optional)
   ```bash
   nano .env  # or notepad .env on Windows
   ```

2. **Start Servers**
   ```bash
   mcp start
   ```

3. **Connect to Claude**
   - The installer will guide you

4. **Read the Docs**
   - [Setup Guide](docs/SETUP.md)
   - [API Documentation](docs/API.md)
   - [Creating MCP Servers](docs/CREATE_SERVER.md)

---

**That's it! Your MCP system is ready to use!** 🎉