@echo off
setlocal
set "TRAINING_DIR=%~dp0"
node "%TRAINING_DIR%tune-move-ordering-search-cost.mjs" %*
