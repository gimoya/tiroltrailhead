@echo off
echo ================================================
echo Walk Image Processor Uninstaller
echo ================================================

REM Check for administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo This script requires administrator privileges.
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

set INSTALL_DIR=C:\Program Files\walk_image_processor

echo Uninstalling from: %INSTALL_DIR%
echo.

REM Remove from PATH
echo Removing from system PATH...
for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH') do set CURRENT_PATH=%%B
set NEW_PATH=%CURRENT_PATH:;C:\Program Files\walk_image_processor=%
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH /t REG_EXPAND_SZ /d "%NEW_PATH%" /f >nul
echo [OK] Removed from system PATH

REM Remove installation directory
if exist "%INSTALL_DIR%" (
    echo Removing installation directory...
    rmdir /s /q "%INSTALL_DIR%"
    echo [OK] Installation directory removed
) else (
    echo WARNING: Installation directory not found
)

REM Remove desktop shortcut
if exist "%USERPROFILE%\Desktop\Walk Image Processor Help.lnk" (
    echo Removing desktop shortcut...
    del "%USERPROFILE%\Desktop\Walk Image Processor Help.lnk"
    echo [OK] Desktop shortcut removed
)

echo ================================================
echo [OK] UNINSTALLATION COMPLETE!
echo ================================================
echo.
echo The Walk Image Processor has been completely removed.
echo You may need to restart your computer or open a new command prompt
echo for the PATH changes to take effect.
echo.
pause
