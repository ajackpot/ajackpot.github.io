@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "INPUT_JSON=%~1"
if "%INPUT_JSON%"=="" (
  echo Usage: tools\evaluator-training\patch-tuple-residual-profile.bat ^<input-tuple-profile.json^> [output-json] [additional-flags...]
  exit /b 1
)

set "OUTPUT_JSON=%~2"
if "%OUTPUT_JSON%"=="" set "OUTPUT_JSON=%EVALUATOR_TRAINING_OUT%\trained-tuple-residual-profile.patched.json"

shift
shift

set "EXTRA_ARGS="
:collect_extra
if "%~1"=="" goto run
set "EXTRA_ARGS=!EXTRA_ARGS! %1"
shift
goto collect_extra

:run
node "%EVALUATOR_TRAINING_DIR%\patch-tuple-residual-profile.mjs" ^
  --input "%INPUT_JSON%" ^
  --output-json "%OUTPUT_JSON%" !EXTRA_ARGS!
