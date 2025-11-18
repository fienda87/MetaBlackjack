#!/bin/bash

# BlackJack Game - Auto Setup Script
# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}[$1/6]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ️${NC} $1"
}

# Clear screen and show header
clear
echo -e "${PURPLE}"
echo "==============================================="
echo "🎰 BlackJack Game - Auto Installation Script"
echo "==============================================="
echo -e "${NC}"
echo

# Step 1: Check Node.js
print_step "1" "Checking Node.js installation..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    echo
    echo "Please download and install Node.js first:"
    echo -e "${CYAN}📥 https://nodejs.org/${NC}"
    echo
    echo "Choose the LTS version and restart this script."
    echo
    read -p "Press Enter to exit..."
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js found: $NODE_VERSION"

# Step 2: Check project directory
print_step "2" "Checking project directory..."

if [ ! -f "package.json" ]; then
    print_error "package.json not found!"
    echo
    echo "Please make sure you're in the BlackJack game directory."
    echo
    read -p "Press Enter to exit..."
    exit 1
fi

print_success "Project directory confirmed"

# Step 3: Install dependencies
print_step "3" "Installing dependencies..."
print_info "This may take a few minutes..."
echo

if ! npm install; then
    print_error "Failed to install dependencies!"
    echo
    echo "Try running these commands manually:"
    echo "  npm cache clean --force"
    echo "  npm install"
    echo
    read -p "Press Enter to exit..."
    exit 1
fi

print_success "Dependencies installed successfully"

# Step 4: Setup Prisma
print_step "4" "Setting up Prisma..."
echo

# Check if prisma is available locally
if ! npx prisma --version &> /dev/null; then
    print_info "Installing Prisma CLI..."
    if ! npm install prisma --save-dev; then
        print_error "Failed to install Prisma CLI!"
        echo
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

print_success "Prisma CLI ready"

# Step 5: Setup database
print_step "5" "Setting up database..."
echo

if ! npx prisma db push; then
    print_error "Failed to setup database!"
    echo
    echo "Try running manually: npx prisma db push"
    echo
    read -p "Press Enter to exit..."
    exit 1
fi

print_success "Database setup completed"

# Step 6: Start the application
print_step "6" "Starting BlackJack Game..."
echo

echo -e "${GREEN}🎉 Installation completed successfully!${NC}"
echo
echo -e "${PURPLE}===============================================${NC}"
echo -e "${PURPLE}🎰 BlackJack Game is starting...${NC}"
echo -e "${PURPLE}===============================================${NC}"
echo
echo -e "${CYAN}📍 Game URL:${NC} http://localhost:3000"
echo -e "${CYAN}📱 Mobile:${NC} Open http://YOUR_IP:3000 on your phone"
echo -e "${CYAN}🛑 To stop:${NC} Press Ctrl+C"
echo
echo -e "${YELLOW}🚀 Starting server with Socket.IO support...${NC}"
echo

# Get local IP for mobile access
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I | awk '{print $1}')
if [ ! -z "$LOCAL_IP" ]; then
    echo -e "${CYAN}📱 Mobile URL:${NC} http://$LOCAL_IP:3000"
    echo
fi

npm run dev