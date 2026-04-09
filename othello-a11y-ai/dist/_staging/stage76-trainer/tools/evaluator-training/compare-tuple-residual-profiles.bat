@echo off
setlocal
call "%~dp0_path-context.bat"

set "LEFT=%~1"
if "%LEFT%"=="" (
  echo Usage: tools\evaluator-training\compare-tuple-residual-profiles.bat ^<left-json-or-generated.js^> ^<right-json-or-generated.js^> [summary-json]
  exit /b 1
)

set "RIGHT=%~2"
if "%RIGHT%"=="" (
  echo Usage: tools\evaluator-training\compare-tuple-residual-profiles.bat ^<left-json-or-generated.js^> ^<right-json-or-generated.js^> [summary-json]
  exit /b 1
)

set "SUMMARY_JSON=%~3"
if "%SUMMARY_JSON%"=="" set "SUMMARY_JSON=%OTHELLO_BENCHMARK_DIR%\tuple_profile_compare_summary.json"

node "%EVALUATOR_TRAINING_DIR%\compare-tuple-residual-profiles.mjs" --left "%LEFT%" --right "%RIGHT%" --summary-json "%SUMMARY_JSON%"
