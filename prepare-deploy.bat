@echo off
REM ===================================================
REM Quick Deployment Script for Windows
REM Otomatis prepare project untuk deployment
REM ===================================================

echo.
echo ====================================
echo    PREPARING FOR DEPLOYMENT
echo ====================================
echo.

REM 1. Check current branch
for /f "tokens=*" %%a in ('git branch --show-current') do set BRANCH=%%a
if not "%BRANCH%"=="main" (
    echo WARNING: Not on main branch (current: %BRANCH%^)
    set /p confirm="Continue anyway? (Y/N): "
    if /i not "%confirm%"=="Y" (
        echo Cancelled.
        exit /b 0
    )
)

REM 2. Pull latest changes
echo.
echo [1/6] Pulling latest changes...
git pull origin main 2>nul || echo No changes to pull

REM 3. Install dependencies
echo.
echo [2/6] Installing dependencies...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

REM 4. Generate Prisma Client
echo.
echo [3/6] Generating Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo ERROR: Prisma generate failed
    pause
    exit /b 1
)

REM 5. Run build test
echo.
echo [4/6] Testing build...
call npm run build
if errorlevel 1 (
    echo.
    echo ERROR: Build failed! Fix errors before deploying.
    pause
    exit /b 1
)
echo.
echo SUCCESS: Build successful!

REM 6. Run linter
echo.
echo [5/6] Running linter...
call npm run lint
echo.

REM 7. Check for uncommitted changes
echo.
echo [6/6] Checking Git status...
git status --short > nul
for /f %%i in ('git status --porcelain ^| find /c /v ""') do set COUNT=%%i
if %COUNT% gtr 0 (
    echo.
    echo WARNING: You have uncommitted changes:
    git status -s
    echo.
    set /p commit="Commit and push changes? (Y/N): "
    if /i "%commit%"=="Y" (
        set /p message="Commit message: "
        git add .
        git commit -m "%message%"
        git push origin main
        echo.
        echo SUCCESS: Changes committed and pushed!
    )
) else (
    echo SUCCESS: No uncommitted changes
)

REM 8. Final checklist
echo.
echo ======================================
echo    DEPLOYMENT CHECKLIST
echo ======================================
echo.
echo Before deploying to Vercel:
echo.
echo 1. [X] Build tested locally
echo 2. [X] Prisma client generated
echo 3. [X] Dependencies installed
echo.
echo Manual steps:
echo.
echo [ ] Environment variables prepared
echo [ ] Upstash Redis database created
echo [ ] Supabase connection tested
echo [ ] Private keys rotated for production
echo [ ] .env files NOT committed to Git
echo.
echo ======================================
echo.
echo Ready to deploy! Follow steps in:
echo.
echo     DEPLOYMENT_GUIDE.md
echo.
echo Quick links:
echo   - Vercel: https://vercel.com/new
echo   - Upstash: https://console.upstash.com/
echo.
pause
