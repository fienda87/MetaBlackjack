@echo off
REM MetaBlackjack Smart Contract Deployment Script (Windows)
REM Run from: cd blockchain && deploy.bat

setlocal enabledelayedexpansion

echo ============================================
echo ^^ MetaBlackjack Smart Contract Deployment
echo ============================================

REM Check if hardhat.config.js exists
if not exist "hardhat.config.js" (
    echo.
    echo ERROR: hardhat.config.js not found
    echo Please run this script from the blockchain directory
    pause
    exit /b 1
)

REM Get network from argument or default
set NETWORK=%1
if "!NETWORK!"=="" set NETWORK=polygonAmoy

echo.
echo Deploying to network: !NETWORK!
echo.

REM Check if contracts are compiled
if not exist "artifacts" (
    echo Compiling contracts...
    call npx hardhat compile
    if errorlevel 1 (
        echo.
        echo ERROR: Compilation failed
        pause
        exit /b 1
    )
)

REM Run deployment
echo Running deployment script...
call npx hardhat run scripts/deploy.ts --network !NETWORK!

if errorlevel 1 (
    echo.
    echo ERROR: Deployment failed
    pause
    exit /b 1
)

echo.
echo ============================================
echo ^^ Deployment completed successfully!
echo ============================================
echo.
echo Next steps:
echo   1. Check deployments/polygon-amoy.json for contract addresses
echo   2. Fund the faucet contract with GBC tokens
echo   3. Update frontend .env with contract addresses
echo   4. Verify contracts on Polygonscan (optional)
echo.
pause
