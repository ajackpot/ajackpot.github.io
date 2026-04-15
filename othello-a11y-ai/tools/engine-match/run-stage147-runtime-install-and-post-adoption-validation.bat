@echo off
setlocal
set SCRIPT_DIR=%~dp0
node "%SCRIPT_DIR%run-stage147-runtime-install-and-post-adoption-validation.mjs" %*
