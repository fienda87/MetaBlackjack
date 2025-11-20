@echo off
echo ========================================
echo Compiling GBC Token Smart Contract
echo ========================================
echo.

cd blockchain
call npm run compile

if errorlevel 1 (
    echo.
    echo ERROR: Compilation failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Compilation Complete!
echo ========================================
pause
