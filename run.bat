@echo off
cd /d "%~dp0"
echo Avvio Prompt Optimizer in modalita' sviluppo desktop (npm run tauri dev)...
echo Chiudi questa finestra per fermare l'app.
npm run tauri dev
pause
