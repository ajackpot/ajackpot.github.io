@echo off
setlocal
call "%~dp0_path-context.bat"

set "INPUT=%~1"
if "%INPUT%"=="" (
  echo Usage: tools\evaluator-training\benchmark-profile.bat ^<input-file-or-dir^> [candidate-profile-json]
  exit /b 1
)

set "PROFILE=%~2"
if "%PROFILE%"=="" set "PROFILE=%EVALUATOR_TRAINING_OUT%\trained-evaluation-profile.json"

node "%EVALUATOR_TRAINING_DIR%\benchmark-profile.mjs" ^
  --input "%INPUT%" ^
  --candidate-profile "%PROFILE%" ^
  --progress-every 250000
