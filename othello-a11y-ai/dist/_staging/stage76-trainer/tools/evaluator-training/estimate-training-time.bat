@echo off
setlocal
call "%~dp0_path-context.bat"

set "INPUT=%~1"
if "%INPUT%"=="" (
  echo Usage: tools\evaluator-training\estimate-training-time.bat ^<input-file-or-dir^> [sample-limit]
  exit /b 1
)

set "SAMPLE_LIMIT=%~2"
if "%SAMPLE_LIMIT%"=="" set "SAMPLE_LIMIT=200000"

node "%EVALUATOR_TRAINING_DIR%\estimate-training-time.mjs" ^
  --input "%INPUT%" ^
  --sample-limit "%SAMPLE_LIMIT%" ^
  --target-scale 3000 ^
  --holdout-mod 10 ^
  --lambda 5000
