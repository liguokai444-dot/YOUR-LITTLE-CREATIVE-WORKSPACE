@echo off
setlocal
cd /d "%~dp0"
set "STUDIO_NODE=%~dp0.tools\node-v22.23.4-win-x64\node.exe"
if not exist "%STUDIO_NODE%" set "STUDIO_NODE=node"
"%STUDIO_NODE%" "%~dp0scripts\launcher.cjs" start --lan
set "STUDIO_EXIT=%ERRORLEVEL%"
if not "%STUDIO_NO_PAUSE%"=="1" pause
exit /b %STUDIO_EXIT%
