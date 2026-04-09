@echo off
setlocal
call "%~dp0_path-context.bat"
node "%EVALUATOR_TRAINING_DIR%\audit-evaluation-profile.mjs" %*
