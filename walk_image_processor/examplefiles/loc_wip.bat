@echo off
REM Run local Walk Image Processor from examplefiles directory
REM This allows testing the local version with the example images

echo ================================================
echo Walk Image Processor - LOCAL TEST (Example Files)
echo ================================================
echo.

REM Get the parent directory (where the main project is)
set PROJECT_DIR=%~dp0..
set PYTHON_SCRIPT=%PROJECT_DIR%\scripts\process_walk_images.py

REM Check if the Python script exists
if not exist "%PYTHON_SCRIPT%" (
    echo ERROR: Python script not found at:
    echo %PYTHON_SCRIPT%
    echo.
    echo Make sure this batch file is in the examplefiles folder.
    pause
    exit /b 1
)

echo Running LOCAL version from: %PROJECT_DIR%
echo Python script: %PYTHON_SCRIPT%
echo Current directory: %CD%
echo.
echo ================================================

REM Run the local Python script with all passed arguments
python "%PYTHON_SCRIPT%" %*

REM Keep console open if there was an error
if %errorlevel% neq 0 (
    echo.
    echo ================================================
    echo Script finished with errors (exit code: %errorlevel%)
    echo ================================================
    pause
)
