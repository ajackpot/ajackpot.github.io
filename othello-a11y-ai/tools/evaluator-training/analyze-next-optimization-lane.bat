@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
node "%SCRIPT_DIR%analyze-next-optimization-lane.mjs" %*
