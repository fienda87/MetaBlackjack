@echo off
echo ========================================
echo Deploying GBC Token to Polygon Amoy
echo ========================================
echo.
echo Make sure you have:
echo - PRIVATE_KEY in blockchain\.env file
echo - Test MATIC in your wallet
echo.
echo Get test MATIC: https://faucet.polygon.technology/
echo.
pause

cd blockchain
call npm run deploy

if errorlevel 1 (
    echo.
    echo ========================================
    echo Deployment Failed!
    echo ========================================
    echo.
    echo Common issues:
    echo 1. Missing PRIVATE_KEY in blockchain\.env
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
echo.
pause
