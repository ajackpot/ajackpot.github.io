@echo off
setlocal
call "%~dp0_path-context.bat"
if "%~1"=="" (
  echo Usage:
  echo   tools\evaluator-training\benchmark-exact-move-ordering-profile.bat ^<candidate-move-ordering-profile.json^> [evaluation-profile.json] [output-json]
  exit /b 1
)
set "CANDIDATE_MOVE=%~1"
set "EVAL_PROFILE=%~2"
set "OUTPUT=%~3"
if "%OUTPUT%"=="" set "OUTPUT=%OTHELLO_BENCHMARK_DIR%\stage29_exact_move_ordering_benchmark.json"
if "%EVAL_PROFILE%"=="" (
  node "%EVALUATOR_TRAINING_DIR%\benchmark-exact-search-profile.mjs" --candidate-move-ordering-profile "%CANDIDATE_MOVE%" --output-json "%OUTPUT%"
) else (
  node "%EVALUATOR_TRAINING_DIR%\benchmark-exact-search-profile.mjs" --baseline-profile "%EVAL_PROFILE%" --candidate-profile "%EVAL_PROFILE%" --candidate-move-ordering-profile "%CANDIDATE_MOVE%" --output-json "%OUTPUT%"
)
