@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "INPUT=%~1"
if "%INPUT%"=="" (
  echo Usage: tools\evaluator-training\benchmark-tuple-residual-profile.bat ^<input-file-or-dir^> ^<candidate-tuple-profile.json^> [output-json] [additional-flags...]
  exit /b 1
)

set "TUPLE_JSON=%~2"
if "%TUPLE_JSON%"=="" (
  echo Usage: tools\evaluator-training\benchmark-tuple-residual-profile.bat ^<input-file-or-dir^> ^<candidate-tuple-profile.json^> [output-json] [additional-flags...]
  exit /b 1
)

set "OUTPUT_JSON=%~3"
if "%OUTPUT_JSON%"=="" set "OUTPUT_JSON=%OTHELLO_BENCHMARK_DIR%\tuple_residual_corpus_benchmark.json"

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
node "%EVALUATOR_TRAINING_DIR%\benchmark-profile.mjs" ^
  --input "%INPUT%" ^
  --baseline-profile "%EVALUATOR_TRAINING_OUT%\trained-evaluation-profile.json" ^
  --candidate-profile "%EVALUATOR_TRAINING_OUT%\trained-evaluation-profile.json" ^
  --candidate-tuple-profile "%TUPLE_JSON%" ^
  --output-json "%OUTPUT_JSON%" !EXTRA_ARGS!
