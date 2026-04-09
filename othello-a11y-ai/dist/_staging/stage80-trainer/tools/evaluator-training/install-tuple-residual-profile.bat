@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "TUPLE_JSON=%~1"
if "%TUPLE_JSON%"=="" (
  echo Usage: tools\evaluator-training\install-tuple-residual-profile.bat ^<tuple-profile.json^> [output-module] [summary-json] [additional-flags...]
  exit /b 1
)

set "OUTPUT_MODULE=%~2"
if "%OUTPUT_MODULE%"=="" set "OUTPUT_MODULE=%EVALUATOR_GENERATED_MODULE%"

set "SUMMARY_JSON=%~3"
if "%SUMMARY_JSON%"=="" set "SUMMARY_JSON=%OTHELLO_BENCHMARK_DIR%\tuple_residual_install_summary.json"

shift
shift
shift

set "EXTRA_ARGS="
:collect_extra
if "%~1"=="" goto run
set "EXTRA_ARGS=!EXTRA_ARGS! %1"
shift
goto collect_extra

:run
node "%EVALUATOR_TRAINING_DIR%\install-tuple-residual-profile.mjs" ^
  --tuple-json "%TUPLE_JSON%" ^
  --output-module "%OUTPUT_MODULE%" ^
  --summary-json "%SUMMARY_JSON%" !EXTRA_ARGS!
