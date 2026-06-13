@echo off
chcp 65001 >nul
cd /d D:\cc\portfolio-monitor
title 持仓监控
start "" /B npx electron .
