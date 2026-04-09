@echo off
setlocal
call "%~dp0_path-context.bat"
if "%~1"=="" (
  echo Usage:
  echo   tools\evaluator-training\benchmark-depth-search-profile.bat ^<candidate-profile.json^> [output-json]
  exit /b 1
)
set "CANDIDATE=%~1"
set "OUTPUT=%~2"
if "%OUTPUT%"=="" set "OUTPUT=%OTHELLO_BENCHMARK_DIR%\stage29_depth_profile_benchmark.json"
node "%EVALUATOR_TRAINING_DIR%\benchmark-depth-search-profile.mjs" --candidate-profile "%CANDIDATE%" --output-json "%OUTPUT%"
