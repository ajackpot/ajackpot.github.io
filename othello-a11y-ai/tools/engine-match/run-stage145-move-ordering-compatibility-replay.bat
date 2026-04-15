@echo off
setlocal
set SCRIPT_DIR=%~dp0
node "%SCRIPT_DIR%run-stage145-move-ordering-compatibility-replay.mjs" %*
