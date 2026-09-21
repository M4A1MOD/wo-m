@echo off
title Smart Teaching Platform - Stop
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-platform.ps1"
if errorlevel 1 pause
