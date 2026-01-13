@echo off
REM Deployment Script for Quote Out of Hours Automation
REM This script helps deploy the application to various hosting platforms

echo ================================
echo Quote Out of Hours Automation
echo Deployment Helper
echo ================================
echo.

:menu
echo Select deployment method:
echo.
echo 1. Deploy to Netlify (drag and drop)
echo 2. Package as ZIP for upload
echo 3. Deploy via Vercel CLI
echo 4. Open deployment guide
echo 5. Test locally
echo 6. Exit
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto netlify
if "%choice%"=="2" goto package
if "%choice%"=="3" goto vercel
if "%choice%"=="4" goto guide
if "%choice%"=="5" goto test
if "%choice%"=="6" goto end
goto menu

:netlify
echo.
echo Opening Netlify Drop...
start https://app.netlify.com/drop
echo.
echo Instructions:
echo 1. Drag the entire 'dist' folder to the Netlify Drop page
echo 2. Wait for upload to complete
echo 3. Your site will be live instantly!
echo.
pause
goto menu

:package
echo.
echo Creating deployment package...
if exist "quote-automation-deploy.zip" del "quote-automation-deploy.zip"
powershell Compress-Archive -Path * -DestinationPath ..\quote-automation-deploy.zip
echo.
echo Package created: quote-automation-deploy.zip
echo You can now upload this file to your hosting provider.
echo.
pause
goto menu

:vercel
echo.
echo Deploying to Vercel...
echo.
echo Make sure Vercel CLI is installed: npm install -g vercel
echo.
vercel
echo.
pause
goto menu

:guide
echo.
echo Opening deployment guide...
start DEPLOYMENT.md
pause
goto menu

:test
echo.
echo Opening index.html in browser for local testing...
start index.html
echo.
echo Note: Webhook functionality may not work locally due to CORS.
echo For full testing, deploy to a server.
echo.
pause
goto menu

:end
echo.
echo Deployment helper closed.
echo.
exit
