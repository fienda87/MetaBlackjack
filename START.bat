@echo off
title BlackJack Game - Auto Setup
color 0A

echo.
echo  ===============================================
echo  🎰 BlackJack Game - Auto Installation Script
echo  ===============================================
echo.

REM Check if Node.js is installed
echo [1/6] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo.
    echo Please download and install Node.js first:
    echo 📥 https://nodejs.org/
    echo.
    echo Choose the LTS version and restart this script.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js found: %NODE_VERSION%

REM Check if we're in the right directory
echo [2/6] Checking project directory...
if not exist "package.json" (
    echo ❌ package.json not found!
    echo.
    echo Please make sure you're in the BlackJack game directory.
    echo.
    pause
    exit /b 1
)

echo ✅ Project directory confirmed

REM Install dependencies
echo [3/6] Installing dependencies...
echo This may take a few minutes...
echo.

npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies!
    echo.
    echo Try running these commands manually:
    echo   npm cache clean --force
    echo   npm install
    echo.
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Install Prisma CLI locally if not available
echo [4/6] Setting up Prisma...
echo.

REM Check if prisma is available locally
npx prisma --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Prisma CLI...
    npm install prisma --save-dev
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Prisma CLI!
        echo.
        pause
        exit /b 1
    )
)

echo ✅ Prisma CLI ready

REM Setup database
echo [5/6] Setting up database...
echo.

npx prisma db push
if %errorlevel% neq 0 (
    echo ❌ Failed to setup database!
    echo.
    echo Try running manually: npx prisma db push
    echo.
    pause
    exit /b 1
)

echo ✅ Database setup completed

REM Start the application
echo [6/6] Starting BlackJack Game...
echo 🎉 Installation completed successfully!
echo.
echo ===============================================
echo 🎰 BlackJack Game is starting...
echo ===============================================
echo.
echo 📍 Game URL: http://localhost:3000
echo 📱 Mobile: Open http://YOUR_IP:3000 on your phone
echo 🛑 To stop: Press Ctrl+C
echo.
echo 🚀 Starting server with Socket.IO support...
echo.

npm run dev

pause