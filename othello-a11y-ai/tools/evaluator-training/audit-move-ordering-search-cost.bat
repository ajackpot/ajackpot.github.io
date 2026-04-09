@echo off
setlocal
call "%~dp0_path-context.bat" || exit /b 1
node "%TRAINING_DIR%\audit-move-ordering-search-cost.mjs" %*
