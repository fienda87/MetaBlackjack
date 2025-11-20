@echo off
echo ========================================
echo GBC Token Deployment to Polygon Amoy
echo ========================================
echo.

echo Checking .env.local...
if not exist .env.local (
    echo ERROR: .env.local not found!
    echo Please create .env.local from .env.example
    echo.
    pause
    exit /b 1
)

echo.
echo Step 1: Compiling contract...
echo ==============================
call npm run contract:compile
if errorlevel 1 (
    echo.
    echo ERROR: Compilation failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Deploying to Polygon Amoy...
echo ====================================
echo Make sure you have:
echo - Private key in .env.local
echo - Test MATIC in your wallet
echo.
pause

call npm run contract:deploy
if errorlevel 1 (
    echo.
    echo ERROR: Deployment failed!
    echo.
    echo Common issues:
    echo 1. Missing PRIVATE_KEY in .env.local
    echo 2. Insufficient MATIC balance
    echo 3. Wrong network configuration
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Copy contract address from output above
echo 2. Add to .env.local: NEXT_PUBLIC_GBC_TOKEN_ADDRESS=0x...
echo 3. Import token to MetaMask
echo 4. Restart dev server: npm run dev
echo.
pause
