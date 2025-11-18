#!/bin/bash

# ============================================================================
# Universal MCP Setup Script for Unix/Linux/macOS
# Automatically installs ALL prerequisites and dependencies
# No prior technical knowledge required!
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Detect OS
OS="Unknown"
ARCH=$(uname -m)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        DISTRO_VERSION=$VERSION_ID
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
    MACOS_VERSION=$(sw_vers -productVersion)
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="Windows"
    echo -e "${YELLOW}⚠️  Windows detected. Please use setup.ps1 or setup.bat instead${NC}"
    exit 1
fi

# Script configuration
REQUIRED_NODE_VERSION="18"
REQUIRED_PYTHON_VERSION="3.8"
INSTALL_DIR="$PWD"
LOG_FILE="$INSTALL_DIR/setup.log"

# Start logging
exec 2>&1 | tee -a "$LOG_FILE"

# Banner
clear
echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                        ║${NC}"
echo -e "${CYAN}║         ${BOLD}Universal MCP System Auto-Installer${NC}${CYAN}           ║${NC}"
echo -e "${CYAN}║                                                        ║${NC}"
echo -e "${CYAN}║     Complete setup with zero technical knowledge!      ║${NC}"
echo -e "${CYAN}║                                                        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo
echo -e "${MAGENTA}System: $OS | Architecture: $ARCH${NC}"
if [[ "$OS" == "Linux" ]]; then
    echo -e "${MAGENTA}Distribution: $DISTRO $DISTRO_VERSION${NC}"
elif [[ "$OS" == "macOS" ]]; then
    echo -e "${MAGENTA}macOS Version: $MACOS_VERSION${NC}"
fi
echo -e "${MAGENTA}Install Location: $INSTALL_DIR${NC}"
echo
echo -e "${YELLOW}This script will:${NC}"
echo "  1. Install Node.js (if needed)"
echo "  2. Install Python (if needed)"
echo "  3. Install all MCP dependencies"
echo "  4. Configure your environment"
echo "  5. Set up global commands"
echo "  6. Verify everything works"
echo
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to compare versions
version_ge() {
    # Returns 0 if $1 >= $2
    [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

# Function to install Node.js
install_nodejs() {
    echo -e "\n${YELLOW}📦 Installing Node.js...${NC}"

    if [[ "$OS" == "macOS" ]]; then
        # Check for Homebrew
        if command_exists brew; then
            echo "Using Homebrew to install Node.js..."
            brew install node
        else
            echo "Installing Homebrew first..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

            # Add Homebrew to PATH
            if [[ "$ARCH" == "arm64" ]]; then
                echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
                eval "$(/opt/homebrew/bin/brew shellenv)"
            else
                echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zshrc
                eval "$(/usr/local/bin/brew shellenv)"
            fi

            brew install node
        fi

    elif [[ "$OS" == "Linux" ]]; then
        if [[ "$DISTRO" == "ubuntu" ]] || [[ "$DISTRO" == "debian" ]]; then
            echo "Installing Node.js via NodeSource repository..."
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y nodejs

        elif [[ "$DISTRO" == "fedora" ]] || [[ "$DISTRO" == "rhel" ]] || [[ "$DISTRO" == "centos" ]]; then
            echo "Installing Node.js via NodeSource repository..."
            curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
            sudo dnf install -y nodejs

        elif [[ "$DISTRO" == "arch" ]] || [[ "$DISTRO" == "manjaro" ]]; then
            echo "Installing Node.js via pacman..."
            sudo pacman -S --noconfirm nodejs npm

        else
            # Generic installation using n (Node version manager)
            echo "Installing Node.js using n version manager..."
            curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n
            chmod +x n
            sudo mv n /usr/local/bin/n
            sudo n lts
        fi
    fi

    # Verify installation
    if command_exists node; then
        NODE_VERSION=$(node --version | sed 's/v//')
        echo -e "${GREEN}✅ Node.js $NODE_VERSION installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install Node.js${NC}"
        exit 1
    fi
}

# Function to install Python
install_python() {
    echo -e "\n${YELLOW}🐍 Installing Python...${NC}"

    if [[ "$OS" == "macOS" ]]; then
        if command_exists brew; then
            echo "Using Homebrew to install Python..."
            brew install python@3.11
            brew link python@3.11
        else
            echo -e "${RED}❌ Homebrew required. Please install Homebrew first.${NC}"
            exit 1
        fi

    elif [[ "$OS" == "Linux" ]]; then
        if [[ "$DISTRO" == "ubuntu" ]] || [[ "$DISTRO" == "debian" ]]; then
            sudo apt-get update
            sudo apt-get install -y python3 python3-pip python3-venv

        elif [[ "$DISTRO" == "fedora" ]] || [[ "$DISTRO" == "rhel" ]] || [[ "$DISTRO" == "centos" ]]; then
            sudo dnf install -y python3 python3-pip

        elif [[ "$DISTRO" == "arch" ]] || [[ "$DISTRO" == "manjaro" ]]; then
            sudo pacman -S --noconfirm python python-pip

        else
            echo -e "${YELLOW}⚠️  Please install Python 3.8+ manually for your distribution${NC}"
            exit 1
        fi
    fi

    # Create python3 symlink if needed
    if ! command_exists python3 && command_exists python; then
        if [[ $(python --version 2>&1 | grep -o '[0-9]*' | head -1) -ge 3 ]]; then
            sudo ln -sf $(which python) /usr/local/bin/python3
        fi
    fi

    # Verify installation
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version | grep -o '[0-9.]*')
        echo -e "${GREEN}✅ Python $PYTHON_VERSION installed successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Python installation skipped or failed (optional)${NC}"
    fi
}

# Function to fix npm permissions
fix_npm_permissions() {
    echo -e "\n${YELLOW}🔧 Fixing npm permissions...${NC}"

    # Create npm global directory in user home
    mkdir -p ~/.npm-global
    npm config set prefix '~/.npm-global'

    # Add to PATH
    if [[ "$OS" == "macOS" ]]; then
        SHELL_RC="$HOME/.zshrc"
        [ ! -f "$SHELL_RC" ] && SHELL_RC="$HOME/.bash_profile"
    else
        SHELL_RC="$HOME/.bashrc"
    fi

    if ! grep -q ".npm-global/bin" "$SHELL_RC" 2>/dev/null; then
        echo 'export PATH=~/.npm-global/bin:$PATH' >> "$SHELL_RC"
    fi

    export PATH=~/.npm-global/bin:$PATH

    echo -e "${GREEN}✅ npm permissions fixed${NC}"
}

# Main installation process
main() {
    echo -e "\n${BOLD}${BLUE}Step 1: Checking prerequisites...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check and install Node.js
    NODE_INSTALLED=false
    if command_exists node; then
        NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
        if [ "$NODE_VERSION" -ge "$REQUIRED_NODE_VERSION" ]; then
            echo -e "${GREEN}✅ Node.js $(node --version) is installed${NC}"
            NODE_INSTALLED=true
        else
            echo -e "${YELLOW}⚠️  Node.js version is too old ($(node --version))${NC}"
            install_nodejs
        fi
    else
        echo -e "${YELLOW}⚠️  Node.js not found${NC}"
        install_nodejs
    fi

    # Check npm
    if ! command_exists npm; then
        echo -e "${RED}❌ npm not found. Reinstalling Node.js...${NC}"
        install_nodejs
    else
        echo -e "${GREEN}✅ npm $(npm --version) is installed${NC}"
    fi

    # Check and install Python (optional)
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version | grep -o '[0-9.]*' | cut -d. -f1,2)
        if version_ge "$PYTHON_VERSION" "$REQUIRED_PYTHON_VERSION"; then
            echo -e "${GREEN}✅ Python $(python3 --version) is installed${NC}"
        else
            echo -e "${YELLOW}⚠️  Python version is too old${NC}"
            install_python
        fi
    elif command_exists python; then
        PYTHON_VERSION=$(python --version 2>&1 | grep -o '[0-9.]*' | cut -d. -f1)
        if [ "$PYTHON_VERSION" -ge "3" ]; then
            echo -e "${GREEN}✅ Python $(python --version 2>&1) is installed${NC}"
        else
            echo -e "${YELLOW}⚠️  Python 2.x found, need Python 3.x${NC}"
            install_python
        fi
    else
        echo -e "${YELLOW}⚠️  Python not found (optional)${NC}"
        read -p "Install Python? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_python
        fi
    fi

    # Fix npm permissions if needed
    npm_test_dir="/tmp/npm-test-$$"
    if ! npm install -g --prefix "$npm_test_dir" npm >/dev/null 2>&1; then
        fix_npm_permissions
    fi
    rm -rf "$npm_test_dir"

    echo -e "\n${BOLD}${BLUE}Step 2: Installing MCP dependencies...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Run the MCP installer
    if [ -f "scripts/install.js" ]; then
        node scripts/install.js
    else
        echo -e "${RED}❌ MCP installer not found. Are you in the MCP directory?${NC}"
        exit 1
    fi

    echo -e "\n${BOLD}${BLUE}Step 3: Setting up environment...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo -e "${GREEN}✅ Created .env file from template${NC}"
        else
            echo -e "${YELLOW}⚠️  No .env.example found, creating basic .env${NC}"
            cat > .env << 'EOF'
# MCP Environment Configuration
# Auto-generated by setup script
MCP_LOG_LEVEL=info
NODE_ENV=production
EOF
        fi
    else
        echo -e "${GREEN}✅ .env file already exists${NC}"
    fi

    # Make scripts executable
    chmod +x launchers/run-all.sh 2>/dev/null || true
    chmod +x scripts/install.js 2>/dev/null || true
    chmod +x cli/mcp-cli.js 2>/dev/null || true

    echo -e "\n${BOLD}${BLUE}Step 4: Setting up global commands...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Try to set up global mcp command
    if npm link 2>/dev/null; then
        echo -e "${GREEN}✅ Global 'mcp' command installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not install global command (permission denied)${NC}"
        echo "   You can still use: node cli/mcp-cli.js"
    fi

    # Create convenient start script
    cat > start.sh << 'EOF'
#!/bin/bash
# Quick start script for MCP
cd "$(dirname "$0")"
node launchers/run-all.js
EOF
    chmod +x start.sh

    echo -e "\n${BOLD}${BLUE}Step 5: Verifying installation...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Run health check
    if node cli/mcp-cli.js health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ MCP system is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check had warnings${NC}"
    fi

    # List available servers
    echo -e "\n${CYAN}Available MCP Servers:${NC}"
    node cli/mcp-cli.js list 2>/dev/null || echo "Run 'node cli/mcp-cli.js list' to see servers"

    # Success message
    echo
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}║         🎉 Installation Complete! 🎉                   ║${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BOLD}Quick Start Commands:${NC}"
    echo
    echo -e "  ${CYAN}Start all servers:${NC}"
    echo -e "    ./start.sh"
    echo -e "    ${MAGENTA}or${NC}"
    echo -e "    node launchers/run-all.js"
    echo
    echo -e "  ${CYAN}Use MCP CLI:${NC}"
    if command_exists mcp; then
        echo -e "    mcp start"
        echo -e "    mcp status"
        echo -e "    mcp help"
    else
        echo -e "    node cli/mcp-cli.js start"
        echo -e "    node cli/mcp-cli.js status"
        echo -e "    node cli/mcp-cli.js help"
    fi
    echo
    echo -e "${YELLOW}📝 Notes:${NC}"
    echo "  • Logs saved to: $LOG_FILE"
    echo "  • Edit .env file to add API keys"
    echo "  • Documentation: docs/SETUP.md"
    echo

    # Ask if user wants to start servers now
    read -p "Start MCP servers now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "\n${CYAN}Starting MCP servers...${NC}"
        node launchers/run-all.js
    fi
}

# Error handler
trap 'echo -e "\n${RED}❌ Installation failed! Check $LOG_FILE for details${NC}"; exit 1' ERR

# Run main installation
main "$@"