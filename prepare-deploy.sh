#!/bin/bash

# ===================================================
# Quick Deployment Script
# Otomatis prepare project untuk deployment
# ===================================================

set -e  # Exit on error

echo "🚀 Preparing project for deployment..."
echo ""

# 1. Check if on main branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
    echo "⚠️  Warning: Not on main branch (current: $BRANCH)"
    read -p "Continue anyway? (y/n): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

# 2. Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main || echo "No changes to pull"

# 3. Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# 4. Generate Prisma Client
echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate

# 5. Run build test
echo ""
echo "🏗️  Testing build..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
else
    echo ""
    echo "❌ Build failed! Fix errors before deploying."
    exit 1
fi

# 6. Run linter
echo ""
echo "🔍 Running linter..."
npm run lint || echo "⚠️  Linter found issues (non-critical)"

# 7. Check for uncommitted changes
echo ""
if [[ -n $(git status -s) ]]; then
    echo "⚠️  You have uncommitted changes:"
    git status -s
    echo ""
    read -p "Commit and push changes? (y/n): " commit
    if [[ $commit =~ ^[Yy]$ ]]; then
        read -p "Commit message: " message
        git add .
        git commit -m "$message"
        git push origin main
        echo "✅ Changes committed and pushed!"
    fi
else
    echo "✅ No uncommitted changes"
fi

# 8. Final checklist
echo ""
echo "======================================"
echo "   DEPLOYMENT CHECKLIST"
echo "======================================"
echo ""
echo "Before deploying to Vercel:"
echo ""
echo "1. ✅ Build tested locally"
echo "2. ✅ Prisma client generated"
echo "3. ✅ Dependencies installed"
echo ""
echo "Manual steps:"
echo ""
echo "□ Environment variables prepared"
echo "□ Upstash Redis database created"
echo "□ Supabase connection tested"
echo "□ Private keys rotated for production"
echo "□ .env files NOT committed to Git"
echo ""
echo "======================================"
echo ""
echo "Ready to deploy! Follow steps in:"
echo "📄 DEPLOYMENT_GUIDE.md"
echo ""
echo "Quick links:"
echo "• Vercel: https://vercel.com/new"
echo "• Upstash: https://console.upstash.com/"
echo ""
