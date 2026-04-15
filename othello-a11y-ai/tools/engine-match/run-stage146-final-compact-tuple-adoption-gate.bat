@echo off
setlocal
set SCRIPT_DIR=%~dp0
node "%SCRIPT_DIR%run-stage146-final-compact-tuple-adoption-gate.mjs" %*
