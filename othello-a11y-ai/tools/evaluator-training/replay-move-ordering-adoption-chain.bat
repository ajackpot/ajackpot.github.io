@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
node "%SCRIPT_DIR%replay-move-ordering-adoption-chain.mjs" %*
