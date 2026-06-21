@echo off
cd /d "%~dp0"
start "Backend Server" cmd /k "cd backend && node server.js"
node "%cd%\node_modules\react-scripts\bin\react-scripts.js" start
pause
