@echo off
title MaxNews - Aggregatore Notizie
echo ================================================================
echo                    MaxNews - Web Application (v1.1)
echo ================================================================
echo Avvio del server MaxNews in corso...
echo.
echo ACCESSO DA QUESTO PC (Desktop):
echo   http://localhost:8000
echo.
echo ACCESSO DA SMARTPHONE (stessa rete Wi-Fi / LAN):
for /f "tokens=4" %%a in ('route print^|find " 0.0.0.0 "') do (
    set LOCAL_IP=%%a
)
echo   http://%LOCAL_IP%:8000
echo ================================================================

start "" http://localhost:8000
python server.py

pause
