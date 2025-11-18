@echo off
title Test Prisma Setup
color 0B

echo.
echo ===============================================
echo 🧪 Testing Prisma Setup - BlackJack Game
echo ===============================================
echo.

echo [1/4] Testing Node.js...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js not found
    pause
    exit /b 1
)
echo ✅ Node.js OK
echo.

echo [2/4] Testing npm...
npm --version
if %errorlevel% neq 0 (
    echo ❌ npm not found
    pause
    exit /b 1
)
echo ✅ npm OK
echo.

echo [3/4] Testing Prisma CLI...
npx prisma --version
if %errorlevel% neq 0 (
    echo ❌ Prisma CLI not found
    echo Installing Prisma CLI...
    npm install prisma --save-dev
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Prisma
        pause
        exit /b 1
    )
)
echo ✅ Prisma CLI OK
echo.

echo [4/4] Testing Prisma Client Generation...
npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)
echo ✅ Prisma Client Generated
echo.

echo 🎉 All tests passed! Prisma setup is working correctly.
echo.
echo You can now run: npm run dev
echo.
pause