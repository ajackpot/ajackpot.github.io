@echo off
setlocal
call "%~dp0_path-context.bat"

set "INPUT=%~1"
if "%INPUT%"=="" (
  echo Usage: tools\evaluator-training\sample-corpus.bat ^<input-file-or-dir^> [output-file] [stride] [max-samples] [min-empties] [max-empties]
  exit /b 1
)

set "OUTPUT=%~2"
if "%OUTPUT%"=="" set "OUTPUT=%EVALUATOR_TRAINING_OUT%\sample-corpus.txt"

set "STRIDE=%~3"
if "%STRIDE%"=="" set "STRIDE=25"

set "MAX_SAMPLES=%~4"
if "%MAX_SAMPLES%"=="" set "MAX_SAMPLES=1000000"

set "MIN_EMPTIES=%~5"
if "%MIN_EMPTIES%"=="" set "MIN_EMPTIES=0"

set "MAX_EMPTIES=%~6"
if "%MAX_EMPTIES%"=="" set "MAX_EMPTIES=60"

node "%EVALUATOR_TRAINING_DIR%\sample-corpus.mjs" ^
  --input "%INPUT%" ^
  --output "%OUTPUT%" ^
  --stride "%STRIDE%" ^
  --max-samples "%MAX_SAMPLES%" ^
  --min-empties "%MIN_EMPTIES%" ^
  --max-empties "%MAX_EMPTIES%"
