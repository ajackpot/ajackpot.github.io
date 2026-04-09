@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "SUMMARY_JSON=%~1"
if "%SUMMARY_JSON%"=="" set "SUMMARY_JSON=%OTHELLO_BENCHMARK_DIR%\tuple_layout_candidate_size_summary.json"

shift

set "EXTRA_ARGS="
:collect_extra
if "%~1"=="" goto run
set "EXTRA_ARGS=!EXTRA_ARGS! %1"
shift
goto collect_extra

:run
node "%EVALUATOR_TRAINING_DIR%\estimate-tuple-layout-candidate-sizes.mjs" ^
  --summary-json "%SUMMARY_JSON%" !EXTRA_ARGS!
