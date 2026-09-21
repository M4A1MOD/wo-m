@echo off
title Smart Teaching Platform - Start
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-platform.ps1"
if errorlevel 1 (
  echo.
  echo Startup failed. Check the message above and the .runtime logs.
  pause
)
