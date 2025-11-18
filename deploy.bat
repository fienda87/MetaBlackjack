@echo off
REM BlackJack Game Deployment Script for Windows
REM This script automates the deployment process

echo 🎰 BlackJack Game Deployment Script
echo ==================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js detected

REM Install dependencies
echo 📦 Installing dependencies...
npm ci

REM Run linting
echo 🔍 Running code quality checks...
npm run lint

REM Setup database
echo 🗄️ Setting up database...
npx prisma db push

REM Build the application
echo 🏗️ Building application...
npm run build

REM Check if environment file exists
if not exist ".env.local" (
    echo ⚠️  .env.local file not found. Creating from template...
    if exist ".env.example" (
        copy .env.example .env.local
        echo 📝 Please edit .env.local with your environment variables
        echo    Required variables:
        echo    - DATABASE_URL (for production)
        echo    - NODE_ENV=production
    ) else (
        echo ❌ .env.example file not found
        pause
        exit /b 1
    )
)

REM Deployment options
echo.
echo 🚀 Choose deployment platform:
echo 1) Vercel (Recommended)
echo 2) Netlify
echo 3) Railway
echo 4) Docker
echo 5) Build only

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo 🌐 Deploying to Vercel...
    vercel --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo 📦 Installing Vercel CLI...
        npm i -g vercel
    )
    vercel --prod
) else if "%choice%"=="2" (
    echo 🌐 Deploying to Netlify...
    netlify --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo 📦 Installing Netlify CLI...
        npm i -g netlify-cli
    )
    netlify deploy --prod --dir=.next
) else if "%choice%"=="3" (
    echo 🌐 Deploying to Railway...
    railway --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo 📦 Installing Railway CLI...
        npm i -g @railway/cli
    )
    railway login
    railway up
) else if "%choice%"=="4" (
    echo 🐳 Building Docker image...
    docker build -t blackjack-game .
    echo ✅ Docker image built successfully
    echo 🚀 Run with: docker run -p 3000:3000 blackjack-game
) else if "%choice%"=="5" (
    echo ✅ Build completed successfully
    echo 📁 Build files are in .next directory
) else (
    echo ❌ Invalid choice
    pause
    exit /b 1
)

echo.
echo 🎉 Deployment process completed!
echo.
echo 📋 Post-deployment checklist:
echo - [ ] Verify the application is accessible
echo - [ ] Test game functionality
echo - [ ] Check mobile responsiveness
echo - [ ] Test Socket.IO real-time features
echo - [ ] Monitor error logs
echo - [ ] Set up analytics and monitoring
echo.
echo 🔗 For more deployment options, see DEPLOYMENT.md
pause