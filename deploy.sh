#!/bin/bash

# BlackJack Game Deployment Script
# This script automates the deployment process

set -e

echo "🎰 BlackJack Game Deployment Script"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to 18+"
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running code quality checks..."
npm run lint

# Setup database
echo "🗄️ Setting up database..."
npx prisma db push

# Build the application
echo "🏗️ Building application..."
npm run build

# Check if environment file exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "📝 Please edit .env.local with your environment variables"
        echo "   Required variables:"
        echo "   - DATABASE_URL (for production)"
        echo "   - NODE_ENV=production"
    else
        echo "❌ .env.example file not found"
        exit 1
    fi
fi

# Deployment options
echo ""
echo "🚀 Choose deployment platform:"
echo "1) Vercel (Recommended)"
echo "2) Netlify"
echo "3) Railway"
echo "4) Docker"
echo "5) Build only"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "🌐 Deploying to Vercel..."
        if ! command -v vercel &> /dev/null; then
            echo "📦 Installing Vercel CLI..."
            npm i -g vercel
        fi
        vercel --prod
        ;;
    2)
        echo "🌐 Deploying to Netlify..."
        if ! command -v netlify &> /dev/null; then
            echo "📦 Installing Netlify CLI..."
            npm i -g netlify-cli
        fi
        netlify deploy --prod --dir=.next
        ;;
    3)
        echo "🌐 Deploying to Railway..."
        if ! command -v railway &> /dev/null; then
            echo "📦 Installing Railway CLI..."
            npm i -g @railway/cli
        fi
        railway login
        railway up
        ;;
    4)
        echo "🐳 Building Docker image..."
        docker build -t blackjack-game .
        echo "✅ Docker image built successfully"
        echo "🚀 Run with: docker run -p 3000:3000 blackjack-game"
        ;;
    5)
        echo "✅ Build completed successfully"
        echo "📁 Build files are in .next directory"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment process completed!"
echo ""
echo "📋 Post-deployment checklist:"
echo "- [ ] Verify the application is accessible"
echo "- [ ] Test game functionality"
echo "- [ ] Check mobile responsiveness"
echo "- [ ] Test Socket.IO real-time features"
echo "- [ ] Monitor error logs"
echo "- [ ] Set up analytics and monitoring"
echo ""
echo "🔗 For more deployment options, see DEPLOYMENT.md"