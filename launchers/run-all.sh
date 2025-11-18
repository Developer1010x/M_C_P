#!/bin/bash

# Universal MCP Server Launcher for Unix-like systems
# Works on macOS, Linux, and WSL

set -e  # Exit on error

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Universal MCP Server Launcher      ║${NC}"
echo -e "${CYAN}║         Unix/Linux/macOS Edition       ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo

# Detect operating system
OS="Unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    OS="Windows (WSL/Cygwin)"
elif [[ "$OSTYPE" == "freebsd"* ]]; then
    OS="FreeBSD"
fi

echo -e "${MAGENTA}Platform: $OS | Shell: $SHELL${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ ERROR: Node.js is not installed${NC}"
    echo
    echo "Please install Node.js:"

    if [[ "$OS" == "macOS" ]]; then
        echo "  brew install node"
        echo "  or download from: https://nodejs.org"
    elif [[ "$OS" == "Linux" ]]; then
        echo "  sudo apt-get install nodejs  # Debian/Ubuntu"
        echo "  sudo yum install nodejs      # RHEL/CentOS"
        echo "  or use NodeSource: https://github.com/nodesource/distributions"
    else
        echo "  Download from: https://nodejs.org"
    fi

    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}"

# Check for Python (optional, for Python-based MCP servers)
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    echo -e "${GREEN}✓ Python version: $PYTHON_VERSION${NC}"
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version 2>&1)
    echo -e "${GREEN}✓ Python version: $PYTHON_VERSION${NC}"
else
    echo -e "${YELLOW}⚠ WARNING: Python not found. Python-based MCP servers will not work.${NC}"
fi

echo
echo -e "${BLUE}Starting MCP servers...${NC}"
echo "----------------------------------------"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to script directory
cd "$SCRIPT_DIR"

# Check if run-all.js exists
if [ ! -f "run-all.js" ]; then
    echo -e "${RED}❌ ERROR: run-all.js not found in $SCRIPT_DIR${NC}"
    echo "Please ensure the file structure is correct."
    exit 1
fi

# Function to handle cleanup on exit
cleanup() {
    echo
    echo -e "${YELLOW}📍 Shutting down MCP servers...${NC}"
    # The Node.js process will handle the cleanup
    exit 0
}

# Trap signals for graceful shutdown
trap cleanup SIGINT SIGTERM

# Parse command line arguments
ARGS="$@"

# Check for help flag
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    node run-all.js --help
    exit 0
fi

# Run the Node.js launcher with any provided arguments
node run-all.js $ARGS

# Check exit code
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    echo
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo -e "${RED} MCP servers stopped with error code $EXIT_CODE${NC}"
    echo -e "${RED}════════════════════════════════════════${NC}"
    exit $EXIT_CODE
fi

echo
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  All MCP servers stopped normally${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"