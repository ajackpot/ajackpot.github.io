@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "EVAL_JSON=%~1"
if "%EVAL_JSON%"=="" set "EVAL_JSON=%EVALUATOR_TRAINING_OUT%\trained-evaluation-profile.json"

set "MOVE_JSON=%~2"
if "%MOVE_JSON%"=="" set "MOVE_JSON=%EVALUATOR_TRAINING_OUT%\trained-move-ordering-profile.json"

set "OUTPUT_MODULE=%~3"
if "%OUTPUT_MODULE%"=="" set "OUTPUT_MODULE=%EVALUATOR_TRAINING_OUT_GENERATED_MODULE%"

set "SUMMARY_JSON=%~4"
if "%SUMMARY_JSON%"=="" set "SUMMARY_JSON=%OTHELLO_BENCHMARK_DIR%\generated_profile_module_summary.json"

shift
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
node "%EVALUATOR_TRAINING_DIR%\build-generated-profile-module.mjs" ^
  --evaluation-json "%EVAL_JSON%" ^
  --move-ordering-json "%MOVE_JSON%" ^
  --output-module "%OUTPUT_MODULE%" ^
  --summary-json "%SUMMARY_JSON%" !EXTRA_ARGS!
