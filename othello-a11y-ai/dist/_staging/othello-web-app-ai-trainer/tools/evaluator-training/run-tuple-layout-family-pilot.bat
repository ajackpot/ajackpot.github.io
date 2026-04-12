@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "INPUT=%~1"
if "%INPUT%"=="" (
  echo Usage: tools\evaluator-training\run-tuple-layout-family-pilot.bat ^<input-file-or-dir^> [output-dir] [additional-flags...]
  exit /b 1
)

set "OUTPUT_DIR=%~2"
if "%OUTPUT_DIR%"=="" set "OUTPUT_DIR=%EVALUATOR_TRAINING_OUT%\tuple-layout-family-pilot"

shift
shift

set "EXTRA_ARGS="
:collect_extra
if "%~1"=="" goto run
set "EXTRA_ARGS=!EXTRA_ARGS! %1"
shift
goto collect_extra

:run
node "%EVALUATOR_TRAINING_DIR%\run-tuple-layout-family-pilot.mjs" ^
  --input "%INPUT%" ^
  --output-dir "%OUTPUT_DIR%" !EXTRA_ARGS!
