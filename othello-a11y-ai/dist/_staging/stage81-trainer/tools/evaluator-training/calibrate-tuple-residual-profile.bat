@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "TUPLE_JSON=%~1"
if "%TUPLE_JSON%"=="" (
  echo Usage: tools\evaluator-training\calibrate-tuple-residual-profile.bat ^<tuple-profile.json^> [output-json] [additional-flags...]
  exit /b 1
)

set "OUTPUT_JSON=%~2"
if "%OUTPUT_JSON%"=="" set "OUTPUT_JSON=%EVALUATOR_TRAINING_OUT%\trained-tuple-residual-profile.calibrated.json"

shift
shift

set "EXTRA_ARGS="
:collect_extra
if "%~1"=="" goto run
set "EXTRA_ARGS=!EXTRA_ARGS! %1"
shift
goto collect_extra

:run
node "%EVALUATOR_TRAINING_DIR%\calibrate-tuple-residual-profile.mjs" ^
  --tuple-json "%TUPLE_JSON%" ^
  --output-json "%OUTPUT_JSON%" !EXTRA_ARGS!
