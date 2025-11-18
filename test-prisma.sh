#!/bin/bash

# Test Prisma Setup Script
# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "==============================================="
echo "🧪 Testing Prisma Setup - BlackJack Game"
echo "==============================================="
echo -e "${NC}"
echo

# Test Node.js
echo -e "${BLUE}[1/4]${NC} Testing Node.js..."
if node --version &> /dev/null; then
    echo -e "${GREEN}✅${NC} Node.js OK: $(node --version)"
else
    echo -e "${RED}❌${NC} Node.js not found"
    exit 1
fi
echo

# Test npm
echo -e "${BLUE}[2/4]${NC} Testing npm..."
if npm --version &> /dev/null; then
    echo -e "${GREEN}✅${NC} npm OK: $(npm --version)"
else
    echo -e "${RED}❌${NC} npm not found"
    exit 1
fi
echo

# Test Prisma CLI
echo -e "${BLUE}[3/4]${NC} Testing Prisma CLI..."
if npx prisma --version &> /dev/null; then
    echo -e "${GREEN}✅${NC} Prisma CLI OK: $(npx prisma --version)"
else
    echo -e "${RED}❌${NC} Prisma CLI not found"
    echo -e "${YELLOW}Installing Prisma CLI...${NC}"
    if npm install prisma --save-dev; then
        echo -e "${GREEN}✅${NC} Prisma CLI installed"
    else
        echo -e "${RED}❌${NC} Failed to install Prisma"
        exit 1
    fi
fi
echo

# Test Prisma Client Generation
echo -e "${BLUE}[4/4]${NC} Testing Prisma Client Generation..."
if npx prisma generate; then
    echo -e "${GREEN}✅${NC} Prisma Client Generated"
else
    echo -e "${RED}❌${NC} Failed to generate Prisma client"
    exit 1
fi
echo

echo -e "${GREEN}🎉 All tests passed! Prisma setup is working correctly.${NC}"
echo
echo -e "${YELLOW}You can now run: npm run dev${NC}"
echo