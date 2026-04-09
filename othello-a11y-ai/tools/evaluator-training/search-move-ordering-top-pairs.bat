@echo off
setlocal
set SCRIPT_DIR=%~dp0
node "%SCRIPT_DIR%search-move-ordering-top-pairs.mjs" %*
