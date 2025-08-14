@echo off
echo ================================================
echo Walk Image Processor Installer
echo ================================================
echo.
echo Command Prompt directory: %CD%
echo Install script location: %~dp0
echo Looking for system files in: %~dp0
echo.

REM Check for administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo This script requires administrator privileges.
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

set INSTALL_DIR=C:\Program Files\walk_image_processor

echo Installing to: %INSTALL_DIR%
echo If you need different directory for installation, you need to replace INSTALL_DIR variable in install.bat
echo.

REM Check if Program Files directory exists
if not exist "C:\Program Files" (
    echo ERROR: C:\Program Files directory not found!
    echo This is a critical system directory that should exist.
    echo Please check your Windows installation.
    pause
    exit /b 1
)

REM Check if running from target installation directory
if /I "%~dp0" == "%INSTALL_DIR%\" (
    echo WARNING: Running from installation directory!
    echo Use uninstall.bat to remove, or run install.bat from source folder.
    pause
    exit /b 1
)

REM Create installation directory
if exist "%INSTALL_DIR%" (
    echo.
    echo **************************************************
    echo WARNING: Existing installation found at: 
    echo %INSTALL_DIR%
    echo **************************************************
    echo.
    echo Press any key to continue with installation, 
    echo only if you want to overwrite the existing installation...
    pause >nul
    
    echo Removing existing installation...
    rmdir /s /q "%INSTALL_DIR%"
    echo [OK] Existing installation removed
)

mkdir "%INSTALL_DIR%"
echo [OK] Created installation directory

REM Copy all system files from script directory
echo Copying system files from: %~dp0
echo Script directory contents:
dir "%~dp0" /s /b
echo.

REM Verify required files exist
if not exist "%~dp0scripts\process_walk_images.py" (
    echo ERROR: Required file not found: scripts\process_walk_images.py
    echo.
    echo Make sure install.bat is inside the walk_image_processor folder
    echo with all required system files.
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0wip.bat" (
    echo ERROR: Required file not found: wip.bat
    echo.
    echo Make sure install.bat is inside the walk_image_processor folder
    echo.
    pause
    exit /b 1
)

echo Copying system directory to Program Files...
xcopy /E /I /Q "%~dp0*" "%INSTALL_DIR%"
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy system files!
    pause
    exit /b 1
)
echo [OK] System files copied

REM Verify main files were copied
if not exist "%INSTALL_DIR%\wip.bat" (
    echo ERROR: Main executable not found after copy!
    echo Source was: %~dp0
    echo Target was: %INSTALL_DIR%
    pause
    exit /b 1
)

if not exist "%INSTALL_DIR%\scripts\process_walk_images.py" (
    echo ERROR: Python script not found after copy!
    echo Source was: %~dp0
    echo Target was: %INSTALL_DIR%
    pause
    exit /b 1
)

echo [OK] Main executable and scripts verified

REM Add to system PATH
echo Adding to system PATH...
setx PATH "%PATH%;%INSTALL_DIR%" /M >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Added to system PATH
) else (
    echo WARNING: Could not add to PATH automatically
    echo Please add %INSTALL_DIR% to your system PATH manually
)

REM Verify Python installation
echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python is available
) else (
    echo ERROR: Python not found! Please install Python first.
)

REM Create desktop shortcut for help
echo Creating help shortcut...
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Walk Image Processor Help.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\wip.bat'; $Shortcut.Arguments = '--help'; $Shortcut.Save()"
echo [OK] Help shortcut created on desktop

REM Create uninstaller
echo Creating uninstaller...
(
echo @echo off
echo echo ================================================
echo echo Walk Image Processor Uninstaller
echo echo ================================================
echo.
echo REM Check for administrator privileges
echo net session ^>nul 2^>^&1
echo if %%errorlevel%% neq 0 ^(
echo     echo This script requires administrator privileges.
echo     echo Right-click and select "Run as administrator"
echo     pause
echo     exit /b 1
echo ^)
echo.
echo set INSTALL_DIR=%INSTALL_DIR%
echo.
echo echo Uninstalling from: %%INSTALL_DIR%%
echo echo.
echo.
echo REM Remove from PATH
echo echo Removing from system PATH...
echo for /f "tokens=2*" %%%%A in ^('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH'^) do set CURRENT_PATH=%%%%B
echo set NEW_PATH=%%CURRENT_PATH:;%INSTALL_DIR%=%%
echo reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH /t REG_EXPAND_SZ /d "%%NEW_PATH%%" /f ^>nul
echo echo [OK] Removed from system PATH
echo.
echo REM Remove installation directory
echo if exist "%%INSTALL_DIR%%" ^(
echo     echo Removing installation directory...
echo     rmdir /s /q "%%INSTALL_DIR%%"
echo     echo [OK] Installation directory removed
echo ^) else ^(
echo     echo WARNING: Installation directory not found
echo ^)
echo.
echo REM Remove desktop shortcut
echo if exist "%%USERPROFILE%%\Desktop\Walk Image Processor Help.lnk" ^(
echo     echo Removing desktop shortcut...
echo     del "%%USERPROFILE%%\Desktop\Walk Image Processor Help.lnk"
echo     echo [OK] Desktop shortcut removed
echo ^)
echo.
echo echo ================================================
echo echo [OK] UNINSTALLATION COMPLETE!
echo echo ================================================
echo echo.
echo echo The Walk Image Processor has been completely removed.
echo echo You may need to restart your computer or open a new command prompt
echo echo for the PATH changes to take effect.
echo echo.
echo pause
) > "%INSTALL_DIR%\uninstall.bat"
echo [OK] Uninstaller created

echo.
echo ================================================
echo [OK] INSTALLATION COMPLETE!
echo ================================================
echo.
echo Usage:
echo 1. Navigate to your images folder
echo 2. Open Command Prompt in that folder  
echo 3. Run: wip --help
echo.
echo Installation Details:
echo - System installed to: %INSTALL_DIR%
echo - Global command: wip (available anywhere)
echo - Desktop help shortcut created
echo - Uninstaller: %INSTALL_DIR%\uninstall.bat
echo.
echo You can now DELETE this folder - the system is installed to C:\Program Files
echo.
echo IMPORTANT: Restart your computer or open a new command prompt
echo for the PATH changes to take effect.
echo.
pause