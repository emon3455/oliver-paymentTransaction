@echo off
REM One-click formatter batch file
REM This script installs dependencies (if needed) and runs the formatter

echo ========================================
echo Fansocial Admin Code Formatter
echo ========================================
echo.

REM Change to formatting directory
cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

REM Run the formatter
echo Running formatter...
echo.
call npm run format

if errorlevel 1 (
    echo.
    echo ERROR: Formatting failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo Formatting complete!
echo Backup saved in: formatting\backup\
echo ========================================
echo.
pause

