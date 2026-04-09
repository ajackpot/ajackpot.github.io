@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "TUPLE_JSON=%~1"
if "%TUPLE_JSON%"=="" (
  echo Usage: tools\evaluator-training\benchmark-exact-tuple-residual-profile.bat ^<candidate-tuple-profile.json^> [output-json] [additional-flags...]
  exit /b 1
)

set "OUTPUT_JSON=%~2"
if "%OUTPUT_JSON%"=="" set "OUTPUT_JSON=%OTHELLO_BENCHMARK_DIR%\tuple_residual_exact_benchmark.json"

shift
shift

set "EXTRA_ARGS="
:collect_extra
if "%~1"=="" goto run
set "EXTRA_ARGS=!EXTRA_ARGS! %1"
shift
goto collect_extra

:run
node "%EVALUATOR_TRAINING_DIR%\benchmark-exact-search-profile.mjs" ^
  --baseline-profile "%EVALUATOR_TRAINING_OUT%\trained-evaluation-profile.json" ^
  --candidate-profile "%EVALUATOR_TRAINING_OUT%\trained-evaluation-profile.json" ^
  --baseline-move-ordering-profile "%EVALUATOR_TRAINING_OUT%\trained-move-ordering-profile.json" ^
  --candidate-move-ordering-profile "%EVALUATOR_TRAINING_OUT%\trained-move-ordering-profile.json" ^
  --candidate-tuple-profile "%TUPLE_JSON%" ^
  --output-json "%OUTPUT_JSON%" !EXTRA_ARGS!
