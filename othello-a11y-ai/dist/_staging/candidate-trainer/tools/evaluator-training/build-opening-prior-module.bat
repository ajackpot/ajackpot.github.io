@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "PRIOR_JSON=%~1"
if "%PRIOR_JSON%"=="" set "PRIOR_JSON=%EVALUATOR_TRAINING_OUT%\trained-opening-prior-profile.json"

set "OUTPUT_MODULE=%~2"
if "%OUTPUT_MODULE%"=="" set "OUTPUT_MODULE=%EVALUATOR_TRAINING_OUT_OPENING_PRIOR_MODULE%"

set "SUMMARY_JSON=%~3"
if "%SUMMARY_JSON%"=="" set "SUMMARY_JSON=%OTHELLO_BENCHMARK_DIR%\generated_opening_prior_module_summary.json"

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
node "%EVALUATOR_TRAINING_DIR%\build-opening-prior-module.mjs" ^
  --opening-prior-json "%PRIOR_JSON%" ^
  --output-module "%OUTPUT_MODULE%" ^
  --summary-json "%SUMMARY_JSON%" !EXTRA_ARGS!
